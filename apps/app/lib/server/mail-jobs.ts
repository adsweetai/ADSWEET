import "server-only";
import { must, type Organization } from "@adsweet/db";
import { costPer, roas } from "@adsweet/playbook";
import { formatDayMonth, formatEuro, formatRoas } from "@adsweet/ui";
import { addDays, nowIso, today } from "@/lib/clock";
import { TRIAL_WARN_FROM_DAY, trialDays } from "@/lib/plans";
import { serviceDb } from "./auth";
import { ownerOf, sendMail, wantsMail } from "./mail";
import { goalFor, goalKind, sumRows, targets, totalsPerAd } from "./metrics";
import { notificationText } from "./notifications";
import { eur, priceOf, VAT } from "./subscription";

// De dagelijkse mails (06:00, na de audit): proefperiode bijna om (dag 27), Actie nodig voor nieuwe meldingen en op
// maandag het weekrapport. Draait via /api/cron/dagelijks (met CRON_SECRET) of in de demo vanaf /mails.

export interface JobResult {
  trial: number;
  action: number;
  weekly: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function runDailyMails(opts: { weekly?: boolean } = {}): Promise<JobResult> {
  const svc = serviceDb();
  const day = today();
  const orgs = must(await svc.from("organizations").select()).filter((o) => !o.agency_parent_id && o.plan !== "agency");
  const res: JobResult = { trial: 0, action: 0, weekly: 0 };
  for (const o of orgs) res.trial += await trialReminder(o, day);
  res.action = await actionNeeded(day);
  const monday = new Date(`${day}T12:00:00Z`).getUTCDay() === 1;
  if (opts.weekly ?? monday) for (const o of orgs) res.weekly += await weekly(o, day);
  return res;
}

/** Dag 27 van de proefperiode: één keer, met een melding in de app en een mail. */
async function trialReminder(o: Organization, day: string): Promise<number> {
  if (o.subscription_status !== "proef" || !o.trial_started_at || !o.trial_ends_at) return 0;
  const { day: n, left } = trialDays(o.trial_started_at, day);
  if (n < TRIAL_WARN_FROM_DAY) return 0;
  const svc = serviceDb();
  const sentBefore = must(await svc.from("notifications").select("id, emailed_at").eq("organization_id", o.id).eq("type", "proef_bijna_om"));
  if (sentBefore.some((x) => x.emailed_at)) return 0;
  const price = priceOf(o.plan, o.founding);
  const vat = round2(price * VAT);
  const date = formatDayMonth(o.trial_ends_at);
  await svc.from("notifications").insert({
    organization_id: o.id,
    type: "proef_bijna_om",
    severity: "warn",
    payload: { days: left, date: o.trial_ends_at, amount: eur(price) },
    href: "/abonnement",
    emailed_at: nowIso(),
  });
  const owner = await ownerOf(o.id);
  if (!owner || !(await wantsMail(o.id, owner.userId, "proef_bijna_om"))) return 0;
  const sent = await sendMail("proefBijnaOm", owner.email, {
    name: owner.name,
    days: left,
    date,
    price: eur(price),
    vat: eur(vat),
    total: eur(round2(price + vat)),
    plan: { starter: "Starter", pro: "Pro", scale: "Scale", agency: "Agency" }[o.plan],
    founding: o.founding,
  });
  return sent ? 1 : 0;
}

/** Nieuwe meldingen die Actie nodig zijn en nog niet gemaild: één mail per melding, naar wie dat wil. */
async function actionNeeded(day: string): Promise<number> {
  const svc = serviceDb();
  const notes = must(await svc.from("notifications").select().eq("severity", "act").is("emailed_at", null));
  let n = 0;
  for (const note of notes) {
    const owner = await ownerOf(note.organization_id);
    if (owner && (await wantsMail(note.organization_id, owner.userId, note.type))) {
      const txt = await notificationText(note, day);
      const sent = await sendMail("actieNodig", owner.email, {
        name: owner.name,
        subject: txt.type,
        title: txt.what.charAt(0).toLowerCase() + txt.what.slice(1),
        body: [txt.mean, txt.todo].filter(Boolean),
      });
      if (sent) n++;
    }
    await svc.from("notifications").update({ emailed_at: nowIso() }).eq("id", note.id);
  }
  return n;
}

/** Het weekrapport van vorige week (maandag tot zondag), zoals /weekrapport. */
async function weekly(o: Organization, day: string): Promise<number> {
  const svc = serviceDb();
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  const monday = addDays(day, -((dow + 6) % 7));
  const [from, to, prevFrom, prevTo] = [addDays(monday, -7), addDays(monday, -1), addDays(monday, -14), addDays(monday, -8)];
  const [goals, campaigns, ads, rows] = await Promise.all([
    svc.from("goals").select().eq("organization_id", o.id).then(must),
    svc.from("campaigns").select().eq("organization_id", o.id).then(must),
    svc.from("ads").select().eq("organization_id", o.id).then(must),
    svc.from("insights_daily").select().eq("organization_id", o.id).gte("date", prevFrom).lte("date", to).then(must),
  ]);
  const vast = campaigns.filter((c) => c.kind === "vast" && !c.outside_adsweet);
  const ids = new Set(vast.map((c) => c.id));
  const weekRows = rows.filter((r) => ids.has(r.campaign_id) && r.date >= from && r.date <= to);
  if (!weekRows.length) return 0;
  const owner = await ownerOf(o.id);
  if (!owner) return 0;
  const goal = goalFor(goals, vast[0]?.ad_account_id);
  const kind = goalKind(goal, vast[0]);
  const tg = targets(goal);
  const w = sumRows(weekRows);
  const prevRows = rows.filter((r) => ids.has(r.campaign_id) && r.date >= prevFrom && r.date <= prevTo);
  const p = prevRows.length ? sumRows(prevRows) : null;
  const perAd = totalsPerAd(weekRows);
  const results = (id: string) => (kind === "leads" ? (perAd.get(id)?.leads ?? 0) : (perAd.get(id)?.purchases ?? 0));
  const mine = ads.filter((a) => ids.has(a.campaign_id));
  const best = mine.filter((a) => a.label === "winnaar").sort((a, b) => results(b.id) - results(a.id))[0];
  const worst = mine.filter((a) => a.label === "verliezer").sort((a, b) => (perAd.get(b.id)?.spend ?? 0) - (perAd.get(a.id)?.spend ?? 0))[0];
  const cpl = costPer(w.spend, w.leads);
  const pcpl = p ? costPer(p.spend, p.leads) : null;
  const sent = await sendMail("weekrapport", owner.email, {
    name: owner.name,
    kind,
    spend: formatEuro(w.spend),
    n: kind === "leads" ? w.leads : w.purchases,
    value: kind === "leads" ? (cpl !== null ? formatEuro(cpl, 2) : "–") : formatRoas(roas(w.revenue, w.spend)),
    revenue: formatEuro(w.revenue),
    target: kind === "leads" ? (tg.cpl ? formatEuro(tg.cpl) : undefined) : tg.roasTarget ? formatRoas(tg.roasTarget) : undefined,
    prev: p
      ? {
          n: kind === "leads" ? p.leads : p.purchases,
          value: kind === "leads" ? (pcpl !== null ? formatEuro(pcpl, 2) : "–") : formatRoas(roas(p.revenue, p.spend)),
        }
      : undefined,
    best: best?.name,
    worst: worst ? { name: worst.name, spend: formatEuro(perAd.get(worst.id)?.spend ?? 0) } : undefined,
    week: monday,
  });
  return sent ? 1 : 0;
}
