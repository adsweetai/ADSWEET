import "server-only";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { must, type Organization, type Plan, type SubscriptionStatus } from "@adsweet/db";
import { planPrice } from "@adsweet/playbook";
import { formatDayMonth, formatEuro, formatLongDate } from "@adsweet/ui";
import { today } from "@/lib/clock";
import { PLAN_LIMITS, PLAN_NAME, PLAN_ORDER, trialDays } from "@/lib/plans";
import { getDb, serviceDb } from "./auth";
import { writeLog } from "./changes";
import { getContext, type AppContext } from "./context";
import { creditsFor } from "./credits";
import { demoPanelEnabled } from "./demo-state";
import { sendMail } from "./mail";

// Abonnement en facturen (App.dc.html#abonnement). Alleen de eigenaar beheert het. De betaling zelf loopt via de
// betaalpartner (fase 13); hier staan het plan, de status, de facturen en het opzeggen, bewaard in Supabase.

export const SUB_STATES: SubscriptionStatus[] = ["proef", "actief", "mislukt", "opgezegd", "verlopen"];
export const VAT = 0.21;
/** Jaarlijks betalen: 2 maanden gratis. */
export const YEAR_MONTHS = 10;

const round2 = (n: number) => Math.round(n * 100) / 100;
export const priceOf = (plan: Plan, founding: boolean) => planPrice(plan, founding);
/** Bedragen zoals in het prototype: €195, €136,50. */
export const eur = (n: number) => formatEuro(n, Math.round(n) === n ? 0 : 2);

interface Scheduled {
  plan?: Plan;
  billing_period?: "maandelijks" | "jaarlijks";
  from?: string | null;
}

/** De volgende betaling: het einde van de proefperiode. Daarna weet de betaalpartner het (fase 13). */
const nextPayment = (o: Organization) => (o.subscription_status === "proef" ? o.trial_ends_at : null);

export interface SubscriptionVM {
  mode: "owner" | "notOwner" | "client";
  agency: string | null;
  orgName: string;
  plan: Plan;
  state: SubscriptionStatus;
  founding: boolean;
  period: "maandelijks" | "jaarlijks";
  facts: { k: string; v: string; s: string | null; act?: boolean }[];
  scheduled: { text: string } | null;
  yearlyAction: "yearly" | "monthly" | "undo";
  plans: { id: Plan; price: string; current: boolean }[];
  invoices: { id: string; number: string; date: string; amount: string; vat: string; status: "open" | "betaald" | "mislukt"; pdf: boolean }[];
  noInvoices: string;
  periodEnd: string;
  billing: { name: string; vat: string; address: string; email: string };
  demo: boolean;
  canTrial: boolean;
}

export async function loadSubscription(ctx: AppContext): Promise<SubscriptionVM> {
  const t = await getTranslations("subscription");
  const db = await getDb();
  const o = ctx.org;
  const plan = ctx.plan;
  const founding = o.founding;
  const price = priceOf(plan, founding);
  const state = o.subscription_status;
  const period = o.billing_period;
  const sched = (o.scheduled_change ?? null) as Scheduled | null;
  const base = {
    agency: ctx.agency?.name ?? null,
    orgName: o.name,
    plan,
    state,
    founding,
    period,
    demo: ctx.demo.enabled,
    canTrial: !!o.trial_started_at && !!o.trial_ends_at,
  };
  const periodEnd = o.cancel_at ? formatLongDate(o.cancel_at) : nextPayment(o) ? formatLongDate(nextPayment(o)!) : t("periodEndUnknown");
  const empty = {
    facts: [],
    scheduled: null,
    yearlyAction: "yearly" as const,
    plans: [],
    invoices: [],
    noInvoices: "",
    periodEnd,
    billing: { name: "", vat: "", address: "", email: "" },
  };
  if (ctx.inClient) return { ...base, ...empty, mode: "client" };
  if (ctx.role !== "eigenaar") return { ...base, ...empty, mode: "notOwner" };

  const [members, invites, invoices, credits] = await Promise.all([
    db.from("members").select("id").eq("organization_id", o.id).then(must),
    db.from("invitations").select("id, accepted_at").eq("organization_id", o.id).is("accepted_at", null).then(must),
    db.from("invoices").select().eq("organization_id", o.id).order("issued_at", { ascending: false }).then(must),
    creditsFor(ctx),
  ]);
  const yearly = period === "jaarlijks";
  const charge = yearly ? price * YEAR_MONTHS : price;
  const vat = round2(charge * VAT);
  const next = nextPayment(o);
  const noNext = state === "opgezegd" || state === "verlopen";
  const max = PLAN_LIMITS[plan].users;
  const facts: SubscriptionVM["facts"] = [
    { k: t("facts.plan"), v: t("facts.planV", { plan: PLAN_NAME[plan], period: t(`periods.${period}`) }), s: null },
    {
      k: t("facts.price"),
      v: t("facts.priceV", { price: eur(price) }),
      s: yearly ? t("facts.priceSubYear", { year: eur(price * YEAR_MONTHS) }) : founding ? t("facts.priceSubFounding") : t("facts.priceSub"),
    },
    {
      k: t("facts.status"),
      v: t(`states.${state}`),
      s:
        state === "proef" && o.trial_started_at
          ? t("facts.trialDay", { day: trialDays(o.trial_started_at, today()).day })
          : state === "opgezegd"
            ? t("facts.runsUntil", { date: periodEnd })
            : state === "mislukt"
              ? t("facts.failedSub")
              : null,
      act: state === "mislukt",
    },
    {
      k: t("facts.next"),
      v: noNext ? t("facts.none") : next ? formatDayMonth(next) : t("nextUnknown"),
      s: noNext ? null : t("facts.nextSub", { price: eur(charge), vat: eur(vat), total: eur(round2(charge + vat)) }),
    },
    {
      k: t("facts.credits"),
      v: credits ? t("facts.creditsV", { left: credits.left, total: credits.total }) : t("facts.creditsNone"),
      s: null,
    },
    {
      k: t("facts.users"),
      v: t("facts.usersV", { n: members.length + invites.length, max: max === null ? t("facts.unlimited") : max }),
      s: null,
    },
  ];
  let scheduled: SubscriptionVM["scheduled"] = null;
  if (sched && (sched.plan || sched.billing_period)) {
    const what = sched.plan ? PLAN_NAME[sched.plan] : t(`periods.${sched.billing_period!}`);
    scheduled = { text: sched.from ? t("facts.scheduled", { date: formatDayMonth(sched.from), what }) : t("facts.scheduledNext", { what }) };
  }
  return {
    ...base,
    mode: "owner",
    facts,
    scheduled,
    yearlyAction: sched?.billing_period ? "undo" : yearly ? "monthly" : "yearly",
    plans: PLAN_ORDER.map((id) => ({
      id,
      price: id === "agency" ? t("from", { price: eur(priceOf(id, founding)) }) : eur(priceOf(id, founding)),
      current: id === plan,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      date: formatLongDate(i.issued_at, true),
      amount: eur(Number(i.amount_excl)),
      vat: t("vat", { v: eur(Number(i.vat)) }),
      status: i.status,
      pdf: !!i.pdf_path,
    })),
    noInvoices: state === "proef" && next ? t("noInvoicesTrial", { date: formatDayMonth(next) }) : t("noInvoices"),
    periodEnd,
    billing: { name: o.billing_name ?? "", vat: o.billing_vat ?? "", address: o.billing_address ?? "", email: o.billing_email ?? "" },
  };
}

async function owner() {
  const ctx = await getContext();
  if (ctx.role !== "eigenaar" || ctx.inClient) throw new Error("Alleen de eigenaar beheert het abonnement.");
  return { ctx, db: serviceDb() };
}

export type PlanChange =
  { ok: true; when: "now" | "later"; date: string | null } | { ok: false; error: "accounts" | "users" | "agency" | "same"; n?: number; max?: number };

/** Upgrade gaat meteen in, een downgrade bij de volgende betaling. Agency regelen we samen. */
export async function changePlan(target: Plan): Promise<PlanChange> {
  const { ctx, db } = await owner();
  const t = await getTranslations("subscription");
  const o = ctx.org;
  if (!PLAN_ORDER.includes(target) || target === o.plan) return { ok: false, error: "same" };
  if (target === "agency") return { ok: false, error: "agency" };
  const limits = PLAN_LIMITS[target];
  if (ctx.adAccounts.length > limits.accounts) return { ok: false, error: "accounts", n: ctx.adAccounts.length, max: limits.accounts };
  const users = must(await db.from("members").select("id").eq("organization_id", o.id)).length;
  if (limits.users !== null && users > limits.users) return { ok: false, error: "users", n: users, max: limits.users };
  const up = PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(o.plan);
  const sched = { ...((o.scheduled_change ?? {}) as Scheduled) };
  delete sched.plan;
  if (up) {
    await db
      .from("organizations")
      .update({ plan: target, scheduled_change: sched.billing_period ? sched : null })
      .eq("id", o.id);
  } else {
    await db
      .from("organizations")
      .update({ scheduled_change: { ...sched, plan: target, from: nextPayment(o) } })
      .eq("id", o.id);
  }
  await writeLog(await getDb(), ctx, { kind: "wijziging", what: t("planLog"), from_to: `${PLAN_NAME[o.plan]} → ${PLAN_NAME[target]}` });
  revalidatePath("/", "layout");
  return { ok: true, when: up ? "now" : "later", date: up ? null : nextPayment(o) };
}

/** Jaarlijks of maandelijks, vanaf de volgende betaling. Nog eens klikken trekt het in. */
export async function scheduleBillingPeriod(action: "yearly" | "monthly" | "undo") {
  const { ctx, db } = await owner();
  const o = ctx.org;
  const sched = { ...((o.scheduled_change ?? {}) as Scheduled) };
  if (action === "undo") delete sched.billing_period;
  else sched.billing_period = action === "yearly" ? "jaarlijks" : "maandelijks";
  sched.from = nextPayment(o);
  const keep = sched.plan || sched.billing_period;
  await db
    .from("organizations")
    .update({ scheduled_change: keep ? sched : null })
    .eq("id", o.id);
}

export async function saveBilling(input: { name: string; vat: string; address: string; email: string }): Promise<{ ok: boolean; error?: "email" }> {
  const { ctx, db } = await owner();
  const cut = (s: string, n: number) =>
    String(s ?? "")
      .trim()
      .slice(0, n);
  const email = cut(input.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "email" };
  await db
    .from("organizations")
    .update({
      billing_name: cut(input.name, 120) || null,
      billing_vat: cut(input.vat, 40) || null,
      billing_address: cut(input.address, 300) || null,
      billing_email: email || null,
    })
    .eq("id", ctx.org.id);
  return { ok: true };
}

/** Opzeggen: het abonnement loopt tot het einde van de periode. Je advertenties bij Meta blijven bestaan. */
export async function cancelSubscription(reason: string | null): Promise<{ ok: boolean; until: string }> {
  const { ctx, db } = await owner();
  const t = await getTranslations("subscription");
  const o = ctx.org;
  const reasons = t.raw("reasons") as string[];
  const end = nextPayment(o);
  const until = end ? formatLongDate(end) : t("periodEndUnknown");
  await db
    .from("organizations")
    .update({ subscription_status: "opgezegd", cancel_at: end, cancel_reason: reason && reasons.includes(reason) ? reason : null })
    .eq("id", o.id);
  await writeLog(await getDb(), ctx, { kind: "wijziging", what: t("cancelLog"), from_to: t("cancelLogSub", { date: until }) });
  await sendMail("opgezegd", ctx.profile.email, { date: until });
  revalidatePath("/", "layout");
  return { ok: true, until };
}

/** De opzegging intrekken: terug naar de proefperiode of actief. */
export async function resumeSubscription() {
  const { ctx, db } = await owner();
  const t = await getTranslations("subscription");
  const o = ctx.org;
  const inTrial = !!o.trial_ends_at && o.trial_ends_at >= today();
  await db
    .from("organizations")
    .update({ subscription_status: inTrial ? "proef" : "actief", cancel_at: null, cancel_reason: null })
    .eq("id", o.id);
  await writeLog(await getDb(), ctx, { kind: "wijziging", what: t("resumeLog") });
  revalidatePath("/", "layout");
}

/** Demo: de staat van het abonnement wisselen (alleen met het demopaneel aan). */
export async function demoSubscriptionState(state: SubscriptionStatus) {
  if (!demoPanelEnabled() || !SUB_STATES.includes(state)) return;
  const { ctx, db } = await owner();
  const o = ctx.org;
  if (state === "proef" && !o.trial_started_at) return;
  await db
    .from("organizations")
    .update({ subscription_status: state, cancel_at: state === "opgezegd" ? nextPayment({ ...o, subscription_status: "proef" }) : null })
    .eq("id", o.id);
  revalidatePath("/", "layout");
}
