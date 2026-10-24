import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type OrgKind, type Role, type SeriesColor } from "@adsweet/db";
import { costPer, roas } from "@adsweet/playbook";
import { formatEuro, formatRoas, type StatusKind } from "@adsweet/ui";
import { nowIso, today } from "@/lib/clock";
import { periodRange } from "@/lib/period";
import { getDb, serviceDb } from "./auth";
import { isLive } from "./campaigns";
import { writeLog } from "./changes";
import { assertCanEdit, getContext, type AppContext } from "./context";
import { goalFor, goalKind, statusFor, sumRows, targets } from "./metrics";

// Agency (App.dc.html#klanten): het overzicht van al je klanten, een klant toevoegen en de rechten per klant.
// Alle cijfers komen uit de data van de klanten, over de laatste 7 dagen.

/** Accounts in de staffel van het bureau: [staffel PJ], in het prototype 10. */
export const AGENCY_SLOTS = 10;

export interface ClientRow {
  id: string;
  name: string;
  initial: string;
  color: SeriesColor;
  kind: string;
  spend: string;
  result: string;
  kpi: string;
  goal: string;
  status: StatusKind;
  badge: string;
  open: number;
  owner: string;
}

export interface AgencyVM {
  greeting: string;
  summary: string;
  kpis: { k: string; v: string; s: string; color: SeriesColor }[];
  rows: ClientRow[];
  todo: { clientId: string; client: string; text: string; status: StatusKind; badge: string }[];
  slots: { used: number; total: number };
  owners: { id: string; name: string }[];
}

const KIND_COLOR: Record<OrgKind, SeriesColor> = { webshop: "roos", dienstverlener: "staal", lokaal: "tarwe", zelfstandige: "lavendel", bureau: "lavendel" };

export async function loadAgency(ctx: AppContext): Promise<AgencyVM | null> {
  if (!ctx.agency) return null;
  const t = await getTranslations("agency");
  const tk = await getTranslations("kinds");
  const ts = await getTranslations("ui.status");
  const db = await getDb();
  const clients = ctx.clients;
  const ids = clients.map((c) => c.id);
  const day = today();
  const range = periodRange("7d", day);
  const [campaigns, goals, rows, recs, accounts, members] = await Promise.all([
    ids.length ? db.from("campaigns").select().in("organization_id", ids).then(must) : [],
    ids.length ? db.from("goals").select().in("organization_id", ids).then(must) : [],
    ids.length ? db.from("insights_daily").select().in("organization_id", ids).gte("date", range.from).lte("date", range.to).then(must) : [],
    ids.length ? db.from("recommendations").select().in("organization_id", ids).in("status", ["open", "later"]).order("sort").then(must) : [],
    ids.length ? db.from("ad_accounts").select().in("organization_id", ids).then(must) : [],
    db.from("members").select().eq("organization_id", ctx.agency.id).then(must),
  ]);
  const profiles = members.length
    ? must(
        await db
          .from("profiles")
          .select("user_id, first_name")
          .in(
            "user_id",
            members.map((m) => m.user_id),
          ),
      )
    : [];
  const nameOf = (uid: string | null) => (uid ? (profiles.find((p) => p.user_id === uid)?.first_name ?? "[teamlid]") : "[teamlid]");

  const spendOf = new Map<string, number>();
  const out: ClientRow[] = clients.map((c) => {
    const camps = campaigns.filter((x) => x.organization_id === c.id);
    const main = camps.find((x) => x.kind === "vast" && isLive(x)) ?? camps.find(isLive) ?? null;
    const goal = goalFor(
      goals.filter((g) => g.organization_id === c.id),
      main?.ad_account_id,
    );
    const kind = goalKind(goal, main);
    const tg = targets(goal);
    const s = sumRows(rows.filter((r) => r.organization_id === c.id && (!main || r.campaign_id === main.id)));
    if (main && main.status !== "leerfase") spendOf.set(c.id, s.spend);
    const open = recs.filter((r) => r.organization_id === c.id && (r.status === "open" || (r.snoozed_until && r.snoozed_until <= day))).length;
    const payment = accounts.some((a) => a.organization_id === c.id && a.status === "betaalprobleem");
    const learning = main?.status === "leerfase";
    let status: StatusKind = statusFor(kind, s, goal) ?? "ok";
    if (payment) status = "act";
    let badge = ts(status);
    if (!c.onboarding_done && !main) badge = t("onboarding");
    else if (learning) badge = t("learning");
    const leads = kind === "leads";
    return {
      id: c.id,
      name: c.name,
      initial: c.name.slice(0, 1).toUpperCase(),
      color: KIND_COLOR[c.kind] ?? "lavendel",
      kind: tk(c.kind),
      spend: !main ? "–" : learning ? t("sinceYesterday") : formatEuro(s.spend),
      result: !main
        ? c.onboarding_done
          ? "–"
          : t("onboarding")
        : learning
          ? t("learning")
          : leads
            ? t("leads", { n: s.leads })
            : t("sales", { n: s.purchases }),
      kpi: !main
        ? "–"
        : learning
          ? t("early")
          : leads
            ? t("cpl", { v: formatEuro(costPer(s.spend, s.leads) ?? 0, 2) })
            : t("roas", { v: formatRoas(roas(s.revenue, s.spend), 2) }),
      goal: !main
        ? ""
        : leads
          ? learning
            ? t("goalPerAppointment", { v: formatEuro(tg.cpl ?? 0) })
            : t("goalCpl", { v: formatEuro(tg.cpl ?? 0) })
          : tg.roasTarget
            ? t("goalBe", { v: formatRoas(tg.roasTarget) })
            : "",
      status: learning || (!c.onboarding_done && !main) ? "ok" : status,
      badge,
      open,
      owner: nameOf(c.agency_owner_user_id),
    };
  });

  // Wat vandaag eerst moet: per klant het dringendste (een betaalprobleem, een verliezer, onder de break-even).
  const todo: AgencyVM["todo"] = [];
  for (const r of out) {
    const open = recs.filter((x) => x.organization_id === r.id && x.status === "open" && (x.severity === "act" || x.severity === "warn"));
    const p = (x: (typeof recs)[number]) => x.payload as Record<string, number | string | null>;
    if (accounts.some((a) => a.organization_id === r.id && a.status === "betaalprobleem")) {
      todo.push({ clientId: r.id, client: r.name, text: t("todoPayment", { client: r.name }), status: "act", badge: ts("act") });
      continue;
    }
    const loser = open.find((x) => x.type === "verliezer");
    if (loser) {
      const q = p(loser);
      todo.push({
        clientId: r.id,
        client: r.name,
        text: t(q.goal === "aanvragen" ? "todoLoserLeads" : "todoLoser", {
          ad: String(q.ad_name ?? ""),
          spend: formatEuro(Number(q.spend)),
          limit: formatEuro(Number(q.limit), 2),
        }),
        status: "act",
        badge: ts("act"),
      });
      continue;
    }
    const acc = open.find((x) => x.type === "account_onder_break_even");
    if (acc) {
      const q = p(acc);
      const st = acc.severity === "act" ? "act" : "warn";
      todo.push({
        clientId: r.id,
        client: r.name,
        text: t(st === "act" ? "todoUnder" : "todoUnderWarn", {
          client: r.name,
          spend: formatEuro(Number(q.spend)),
          revenue: formatEuro(Number(q.revenue)),
          roas: formatRoas(Number(q.roas), 2),
          be: formatRoas(Number(q.break_even), 2),
        }),
        status: st,
        badge: ts(st),
      });
    }
  }
  todo.sort((a, b) => (a.status === "act" ? 0 : 1) - (b.status === "act" ? 0 : 1));

  const totalSpend = [...spendOf.values()].reduce((a, b) => a + b, 0);
  const act = out.filter((r) => r.status === "act");
  const first = ctx.profile.first_name ?? "";
  return {
    greeting: t("greeting", { name: first }),
    summary:
      act.length > 0
        ? t("summaryAct", {
            agency: ctx.agency.name,
            n: clients.length,
            act: act.length,
            names: listNames(
              act.map((a) => a.name),
              t("and"),
            ),
          })
        : t("summary", { agency: ctx.agency.name, n: clients.length }),
    kpis: [
      { k: t("kpi.clients"), v: String(clients.length), s: t("kpi.clientsSub", { slots: AGENCY_SLOTS }), color: "lavendel" },
      { k: t("kpi.spend"), v: formatEuro(totalSpend), s: t("kpi.spendSub", { n: spendOf.size }), color: "tarwe" },
      { k: t("kpi.open"), v: String(out.reduce((a, r) => a + r.open, 0)), s: t("kpi.openSub"), color: "salie" },
      {
        k: t("kpi.act"),
        v: String(act.length),
        s: act.length
          ? listNames(
              act.map((a) => a.name),
              t("and"),
            )
          : t("kpi.actNone"),
        color: "roos",
      },
    ],
    rows: out,
    todo,
    slots: { used: clients.length, total: AGENCY_SLOTS },
    owners: members.filter((m) => m.role !== "lezer").map((m) => ({ id: m.user_id, name: nameOf(m.user_id) })),
  };
}

const listNames = (names: string[], and: string) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} ${and} ${names.at(-1)}` : (names[0] ?? ""));

// ---------------------------------------------------------------------------
// Nieuwe klant
// ---------------------------------------------------------------------------

export async function createClient(input: { name: string; website: string; kind: OrgKind; owner: string | null; mode: "invite" | "self"; email: string }) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const agency = ctx.agency;
  if (!agency || ctx.inClient) return { ok: false as const, error: "agency" };
  if (ctx.clients.length >= AGENCY_SLOTS) return { ok: false as const, error: "slots" };
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false as const, error: "name" };
  const email = input.email.trim().toLowerCase();
  if (input.mode === "invite" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "email" };
  const kind: OrgKind = ["webshop", "dienstverlener", "lokaal", "zelfstandige"].includes(input.kind) ? input.kind : "zelfstandige";
  const svc = serviceDb();
  const members = must(await svc.from("members").select("user_id").eq("organization_id", agency.id));
  const owner = input.owner && members.some((m) => m.user_id === input.owner) ? input.owner : null;
  const org = must(
    await svc
      .from("organizations")
      .insert({
        name,
        kind,
        plan: "agency",
        subscription_status: "actief",
        agency_parent_id: agency.id,
        agency_owner_user_id: owner,
        color: KIND_COLOR[kind],
        onboarding_step: 1,
        onboarding_done: false,
        tuning_step: 1,
        naming: { short: name.split(/[,|·]/)[0].trim(), utm_source: "meta", utm_medium: "paid_social" },
      })
      .select()
      .single(),
  );
  await svc.from("business_profiles").insert({ organization_id: org.id, website: input.website.trim().slice(0, 200) || null });
  let token: string | null = null;
  if (input.mode === "invite") {
    const inv = must(
      await svc
        .from("invitations")
        .insert({
          organization_id: org.id,
          email,
          role: "eigenaar",
          invited_by: ctx.user.id,
          expires_at: new Date(Date.parse(nowIso()) + 14 * 86_400_000).toISOString(),
        })
        .select()
        .single(),
    );
    token = inv.token;
  }
  const t = await getTranslations("agency");
  const db = await getDb();
  await writeLog(
    db,
    { ...ctx, org: agency },
    { kind: "wijziging", what: t("logAdded", { name }), from_to: input.mode === "invite" ? t("logInvite") : t("logSelf") },
  );
  return { ok: true as const, id: org.id, token };
}

// ---------------------------------------------------------------------------
// Rechten per klant
// ---------------------------------------------------------------------------

export type Access = "geen" | "lezer" | "beheerder";

export interface RightsVM {
  clients: { id: string; name: string }[];
  members: { userId: string; name: string; role: Role; access: Record<string, Access> }[];
}

export async function loadRights(ctx: AppContext): Promise<RightsVM | null> {
  if (!ctx.agency || ctx.inClient) return null;
  const svc = serviceDb();
  const ids = ctx.clients.map((c) => c.id);
  const [agencyMembers, clientMembers, accounts] = await Promise.all([
    svc.from("members").select().eq("organization_id", ctx.agency.id).then(must),
    ids.length ? svc.from("members").select().in("organization_id", ids).then(must) : [],
    ids.length ? svc.from("ad_accounts").select("id, organization_id").in("organization_id", ids).then(must) : [],
  ]);
  const profiles = agencyMembers.length
    ? must(
        await svc
          .from("profiles")
          .select("user_id, first_name, email")
          .in(
            "user_id",
            agencyMembers.map((m) => m.user_id),
          ),
      )
    : [];
  return {
    clients: ctx.clients.map((c) => ({ id: c.id, name: c.name })),
    members: agencyMembers
      .filter((m) => m.role !== "eigenaar")
      .map((m) => {
        const access: Record<string, Access> = {};
        for (const c of ctx.clients) {
          const direct = clientMembers.find((x) => x.organization_id === c.id && x.user_id === m.user_id);
          const accs = accounts.filter((a) => a.organization_id === c.id).map((a) => a.id);
          const reach = m.ad_account_ids === null || accs.some((a) => m.ad_account_ids!.includes(a));
          access[c.id] = direct ? (direct.role === "lezer" ? "lezer" : "beheerder") : reach ? (m.role === "lezer" ? "lezer" : "beheerder") : "geen";
        }
        const p = profiles.find((x) => x.user_id === m.user_id);
        return { userId: m.user_id, name: p?.first_name ?? p?.email ?? "[teamlid]", role: m.role, access };
      }),
  };
}

/** Per klant: geen toegang, kijken of wijzigen. Alleen de eigenaar van het bureau. */
export async function setClientAccess(userId: string, clientId: string, access: Access) {
  const ctx = await getContext();
  if (!ctx.agency || ctx.inClient || ctx.role !== "eigenaar") return { ok: false };
  if (!ctx.clients.some((c) => c.id === clientId) || !["geen", "lezer", "beheerder"].includes(access)) return { ok: false };
  const svc = serviceDb();
  const member = must(await svc.from("members").select().eq("organization_id", ctx.agency.id).eq("user_id", userId).maybeSingle());
  if (!member || member.role === "eigenaar") return { ok: false };
  const ids = ctx.clients.map((c) => c.id);
  const accounts = must(await svc.from("ad_accounts").select("id, organization_id").in("organization_id", ids));
  const clientAccs = accounts.filter((a) => a.organization_id === clientId).map((a) => a.id);
  // Toegang tot een klant loopt via de advertentieaccounts op het lidmaatschap van het bureau (null = alle klanten).
  let list = member.ad_account_ids ?? accounts.map((a) => a.id);
  list = access === "geen" ? list.filter((a) => !clientAccs.includes(a)) : [...new Set([...list, ...clientAccs])];
  const all = accounts.every((a) => list.includes(a.id));
  await svc
    .from("members")
    .update({ ad_account_ids: all ? null : list })
    .eq("id", member.id);
  // Kijken of wijzigen: een eigen rol in die klant, die voorgaat op de rol in het bureau.
  const direct = must(await svc.from("members").select("id").eq("organization_id", clientId).eq("user_id", userId).maybeSingle());
  if (access === "geen") {
    if (direct) await svc.from("members").delete().eq("id", direct.id);
  } else if (direct) await svc.from("members").update({ role: access }).eq("id", direct.id);
  else await svc.from("members").insert({ user_id: userId, organization_id: clientId, role: access });
  return { ok: true };
}
