import "server-only";
import { getTranslations } from "next-intl/server";
import { must } from "@adsweet/db";
import { formatDayMonth, formatRoas, type SeriesColor } from "@adsweet/ui";
import { today } from "@/lib/clock";
import { hasAI, hasPlan, PLAN_LIMITS, PLAN_NAME, TRIAL_CREDITS, TRIAL_WARN_FROM_DAY, trialDays } from "@/lib/plans";
import { getDb } from "./auth";
import type { AppContext } from "./context";
import { glossaryExamples } from "./glossary";
import { notificationText } from "./notifications";
import { seenTours, type TourName } from "./tours";

export interface ShellAccountItem {
  id: string;
  name: string;
  sub: string;
  active: boolean;
  kind: "all" | "account" | "client";
}

export interface ShellData {
  user: { name: string; initial: string; plan: string };
  plan: AppContext["plan"];
  hasAI: boolean;
  isAgency: boolean;
  account: { name: string; sub: string; initial: string; color: SeriesColor; multi: boolean; list: ShellAccountItem[] };
  inClient: { agency: string; client: string } | null;
  credits: { text: string; left: number; total: number } | null;
  trial: { text: string; warn: boolean } | null;
  banner: { kind: "act" | "warn"; text: string; button: string; href: string } | null;
  bell: { items: { id: string; severity: "act" | "warn" | "ok"; badge: string; what: string; when: string }[]; count: number };
  labels: boolean;
  demo: { enabled: boolean; scenario: string | null; plan: string | null; state: string; labels: boolean };
  roasHint?: string;
  /** Dot (vanaf Pro): de ballon van vandaag, of niets. */
  dot: { balloon: string | null } | null;
  toursSeen: TourName[];
  glossary: Record<string, string>;
}

const DEMO_SCENARIOS: Record<string, string> = {
  "lisa@ateliernoor.voorbeeld": "lisa",
  "tom@peetersdakwerken.voorbeeld": "tom",
  "sarah@salonmila.voorbeeld": "sarah",
  "bram@veldenvuur.voorbeeld": "bram",
  "eva@bureaukompas.voorbeeld": "eva",
};

export async function loadShell(ctx: AppContext): Promise<ShellData> {
  const t = await getTranslations("shell");
  const tk = await getTranslations("kinds");
  const db = await getDb();
  const day = today();
  const { org, plan, demo } = ctx;

  // Credits: som van het grootboek; in de proefperiode hoogstens 50.
  const inTrial = org.subscription_status === "proef" && !!org.trial_started_at && !ctx.inClient;
  let credits: ShellData["credits"] = null;
  if (hasAI(plan) && !ctx.inClient) {
    const ledger = must(await db.from("credits_ledger").select("delta").eq("organization_id", org.id));
    const total = inTrial ? TRIAL_CREDITS : PLAN_LIMITS[plan].credits;
    let left = ledger.length ? ledger.reduce((s, r) => s + r.delta, 0) : total;
    if (demo.state === "credits") left = 0;
    credits = {
      left,
      total,
      text: demo.state === "credits" ? t("creditsEmpty") : inTrial ? t("creditsTrial", { left, total }) : t("creditsMonth", { left, total }),
    };
  }

  // Proefperiodebalk: niet bij een bureau of in een klant.
  let trial: ShellData["trial"] = null;
  if (inTrial && org.trial_started_at && org.trial_ends_at && !ctx.agency) {
    const { day: n, left } = trialDays(org.trial_started_at, day);
    const late = demo.state === "proef" || n >= TRIAL_WARN_FROM_DAY;
    const days = demo.state === "proef" ? 3 : left;
    trial = { warn: late, text: t(late ? "trialLate" : "trial", { days, date: formatDayMonth(org.trial_ends_at) }) };
  }

  // Banner bij een staat die aandacht vraagt: uit de data, of gekozen in het demopaneel.
  const accountProblem = ctx.adAccounts.some((a) => a.status === "betaalprobleem");
  const expired = must(await db.from("connections").select("status").eq("organization_id", org.id).eq("provider", "meta")).some((c) => c.status === "verlopen");
  const bannerState = demo.state !== "normaal" ? demo.state : expired ? "koppeling" : accountProblem ? "betaal" : null;
  const banner: ShellData["banner"] =
    bannerState === "betaal"
      ? { kind: "act", text: t("banner.betaal"), button: t("banner.betaalBtn"), href: "/meldingen" }
      : bannerState === "koppeling"
        ? { kind: "act", text: t("banner.koppeling"), button: t("banner.koppelingBtn"), href: "/instellingen/koppelingen" }
        : bannerState === "credits" && credits
          ? { kind: "warn", text: t("banner.credits"), button: t("banner.creditsBtn"), href: "/abonnement" }
          : null;

  // Accountkiezer
  const multi = hasPlan(plan, "scale") && (ctx.adAccounts.length > 1 || !!ctx.agency);
  let list: ShellAccountItem[];
  let name: string;
  let sub: string;
  let color = org.color as SeriesColor;
  if (ctx.agency) {
    list = [
      { id: ctx.agency.id, name: t("allClients"), sub: String(ctx.clients.length), active: !ctx.inClient, kind: "all" },
      ...ctx.clients.map((c) => ({ id: c.id, name: c.name, sub: tk(c.kind), active: c.id === org.id, kind: "client" as const })),
    ];
    name = ctx.inClient ? org.name : ctx.agency.name;
    sub = ctx.inClient ? "EUR" : t("agencySub", { count: ctx.clients.length });
    color = (ctx.inClient ? org.color : ctx.agency.color) as SeriesColor;
  } else {
    const roas = multi ? await accountRoas(db, org.id, day) : {};
    list = ctx.adAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      sub: multi ? (roas[a.id] ?? "") : a.currency,
      active: a.id === ctx.account?.id,
      kind: "account" as const,
    }));
    if (multi) list.unshift({ id: "", name: t("allAccounts"), sub: "", active: false, kind: "all" });
    name = ctx.account?.name ?? ctx.adAccounts[0]?.name ?? org.name;
    sub = ctx.account?.currency ?? "EUR";
  }

  // Meldingen voor de bel: de nieuwste vier, en het aantal dat aandacht vraagt.
  const notes = must(await db.from("notifications").select().eq("organization_id", org.id).order("created_at", { ascending: false }).limit(20));
  const visible = notes.filter((n) => n.type !== "credits_bijna_op" || hasAI(plan));
  const bellItems = await Promise.all(
    visible.slice(0, 4).map(async (n) => {
      const txt = await notificationText(n, day);
      return { id: n.id, severity: n.severity, badge: txt.badge, what: txt.what, when: txt.when };
    }),
  );

  const first = ctx.profile.first_name ?? ctx.user.email;
  // Dot: hoogstens één keer per dag een ballon met wat er vandaag te doen is.
  let dot: ShellData["dot"] = null;
  if (hasAI(plan) && !(ctx.agency && !ctx.inClient)) {
    const recs = must(await db.from("recommendations").select("status, snoozed_until").eq("organization_id", org.id).in("status", ["open", "later"]));
    const open = recs.filter((r) => r.status === "open" || (r.snoozed_until && r.snoozed_until <= day)).length;
    const td = await getTranslations("dot");
    dot = { balloon: open ? td("balloon", { name: ctx.profile.first_name ?? "", n: open }) : null };
  }
  const [toursSeen, glossary] = await Promise.all([seenTours(ctx.user.id), glossaryExamples(ctx)]);
  return {
    user: { name: first, initial: first.slice(0, 1).toUpperCase(), plan: PLAN_NAME[plan] + (inTrial ? ` · ${t("trialSuffix")}` : "") },
    plan,
    hasAI: hasAI(plan),
    isAgency: !!ctx.agency,
    account: { name, sub, initial: name.slice(0, 1).toUpperCase(), color, multi, list },
    inClient: ctx.inClient && ctx.agency ? { agency: ctx.agency.name, client: org.name } : null,
    credits,
    trial,
    banner,
    bell: { items: bellItems, count: Math.min(9, visible.filter((n) => n.severity !== "ok" && !n.read_at).length) },
    labels: demo.labels,
    demo: { enabled: demo.enabled, scenario: DEMO_SCENARIOS[ctx.user.email] ?? null, plan: demo.plan, state: demo.state, labels: demo.labels },
    dot,
    toursSeen,
    glossary,
  };
}

/** ROAS per advertentieaccount over de laatste 7 dagen, voor de accountkiezer van Scale. */
async function accountRoas(db: Awaited<ReturnType<typeof getDb>>, orgId: string, day: string): Promise<Record<string, string>> {
  const from = new Date(`${day}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 7);
  const to = new Date(`${day}T12:00:00Z`);
  to.setUTCDate(to.getUTCDate() - 1);
  const [camps, rows] = await Promise.all([
    db.from("campaigns").select("id, ad_account_id").eq("organization_id", orgId).then(must),
    db
      .from("insights_daily")
      .select("campaign_id, spend, revenue")
      .eq("organization_id", orgId)
      .gte("date", from.toISOString().slice(0, 10))
      .lte("date", to.toISOString().slice(0, 10))
      .then(must),
  ]);
  const acc = new Map(camps.map((c) => [c.id, c.ad_account_id]));
  const sums: Record<string, { s: number; r: number }> = {};
  for (const r of rows) {
    const a = acc.get(r.campaign_id);
    if (!a) continue;
    sums[a] ??= { s: 0, r: 0 };
    sums[a].s += Number(r.spend);
    sums[a].r += Number(r.revenue ?? 0);
  }
  return Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, v.s ? formatRoas(v.r / v.s) : ""]));
}
