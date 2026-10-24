import Link from "next/link";
import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { must, type Ad } from "@adsweet/db";
import { costPer, roas } from "@adsweet/playbook";
import { formatDayMonth, formatEuro, formatLongDate, formatNumber, formatRoas, Icon } from "@adsweet/ui";
import { addDays, today } from "@/lib/clock";
import { isDemo } from "@/lib/env";
import { routeMetadata } from "@/lib/meta";
import { getDb } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import { goalFor, goalKind, sumRows, targets, totalsPerAd, type Totals } from "@/lib/server/metrics";
import "./weekrapport.css";

export const generateMetadata = routeMetadata("weekrapport");

/** De maandag van het rapport: de gevraagde datum, of de laatste maandag tot vandaag. */
function reportMonday(param: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : today();
  const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
  return addDays(d, -((dow + 6) % 7));
}

export default async function WeekReportPage({ params }: { params: Promise<{ week: string }> }) {
  const ctx = await getContext();
  const t = await getTranslations("report");
  const tt = await getTranslations("today.tile");
  const db = await getDb();
  const monday = reportMonday((await params).week);
  const from = addDays(monday, -7);
  const to = addDays(monday, -1);
  const prevFrom = addDays(monday, -14);
  const prevTo = addDays(monday, -8);

  const [goals, campaigns, ads, rows, recs] = await Promise.all([
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("campaigns").select().eq("organization_id", ctx.org.id).then(must),
    db.from("ads").select().eq("organization_id", ctx.org.id).then(must),
    db.from("insights_daily").select().eq("organization_id", ctx.org.id).gte("date", prevFrom).lte("date", to).then(must),
    db.from("recommendations").select().eq("organization_id", ctx.org.id).order("sort").then(must),
  ]);
  const account = ctx.account;
  const goal = goalFor(goals, account?.id);
  const main = campaigns.find((c) => c.kind === "vast" && (!account || c.ad_account_id === account.id)) ?? campaigns[0];
  const kind = goalKind(goal, main);
  const tg = targets(goal);
  const ids = new Set(campaigns.filter((c) => c.kind === "vast" && (!account || c.ad_account_id === account.id)).map((c) => c.id));
  const week = sumRows(rows.filter((r) => ids.has(r.campaign_id) && r.date >= from && r.date <= to));
  const prevRows = rows.filter((r) => ids.has(r.campaign_id) && r.date >= prevFrom && r.date <= prevTo);
  const prev: Totals | null = prevRows.length ? sumRows(prevRows) : null;
  const name = ctx.profile.first_name ?? "";
  const E = (n: number) => formatEuro(n);
  const ph = { amount: t("placeholders.amount"), count: t("placeholders.count"), roas: t("placeholders.roas") };

  // Samenvatting
  let summary: string;
  if (kind === "leads") {
    const cpl = costPer(week.spend, week.leads);
    const pcpl = prev ? costPer(prev.spend, prev.leads) : null;
    summary = t("sumLeads", {
      name,
      spend: E(week.spend),
      count: week.leads,
      cpl: cpl !== null ? formatEuro(cpl, 2) : "–",
      target: E(tg.cpl ?? 0),
      lastCount: prev?.leads ?? 0,
      lastCpl: pcpl !== null ? formatEuro(pcpl, 2) : "–",
    });
  } else {
    const r = roas(week.revenue, week.spend);
    const be = tg.roasTarget ?? 0;
    const relation = r >= be ? t("above") : r >= be * 0.9 ? t("below") : t("farBelow");
    summary = t("sumSales", {
      name,
      spend: E(week.spend),
      count: week.purchases,
      revenue: E(week.revenue),
      roas: formatRoas(r),
      relation,
      be: formatRoas(be),
      last: prev ? `${E(prev.spend)}, ${formatNumber(prev.purchases)} · ROAS ${formatRoas(roas(prev.revenue, prev.spend))}` : t("lastUnknown"),
    });
  }

  const tileRow = (tot: Totals | null) =>
    kind === "leads"
      ? [
          [tt("spent"), tot ? E(tot.spend) : ph.amount],
          [tt("leads"), tot ? formatNumber(tot.leads) : ph.count],
          [tt("cpl"), tot ? formatEuro(costPer(tot.spend, tot.leads) ?? 0, 2) : ph.amount],
        ]
      : [
          [tt("spent"), tot ? E(tot.spend) : ph.amount],
          [tt("sales"), tot ? formatNumber(tot.purchases) : ph.count],
          [tt("revenue"), tot ? E(tot.revenue) : ph.amount],
          [tt("roas"), tot ? formatRoas(roas(tot.revenue, tot.spend)) : ph.roas],
        ];

  // Beste en slechtste advertentie van de week
  const weekAds = totalsPerAd(rows.filter((r) => r.date >= from && r.date <= to));
  const allAds = totalsPerAd(rows);
  const mine = ads.filter((a) => ids.has(a.campaign_id) && weekAds.has(a.id));
  const res = (a: Ad) => (kind === "leads" ? weekAds.get(a.id)!.leads : weekAds.get(a.id)!.purchases);
  const score = (a: Ad) => {
    const w = weekAds.get(a.id)!;
    return kind === "leads" ? -(costPer(w.spend, w.leads) ?? Infinity) : roas(w.revenue, w.spend);
  };
  const withRes = mine.filter((a) => res(a) > 0).sort((a, b) => score(b) - score(a));
  const without = mine.filter((a) => res(a) === 0).sort((a, b) => weekAds.get(b.id)!.spend - weekAds.get(a.id)!.spend);
  const best = withRes[0];
  const worst = without[0] ?? withRes[withRes.length - 1];
  const describe = (a: Ad, isWorst: boolean) => {
    const w = weekAds.get(a.id)!;
    if (kind === "leads") {
      if (isWorst && w.leads === 0) return t("worstLeads", { spend: E(w.spend), total: E(allAds.get(a.id)?.spend ?? w.spend), target: E(tg.cpl ?? 0) });
      return t("bestLeads", { spend: E(w.spend), count: w.leads, cpl: formatEuro(costPer(w.spend, w.leads) ?? 0, 2) });
    }
    if (isWorst && w.purchases === 0) return t("worstSales", { spend: E(w.spend) });
    return t("bestSales", { spend: E(w.spend), count: w.purchases, roas: formatRoas(roas(w.revenue, w.spend), 2) });
  };

  // Wat AdSweet deze week deed of voorstelde
  const weekRecs = recs.filter((r) => r.created_at.slice(0, 10) >= from && r.created_at.slice(0, 10) <= monday);
  const did = weekRecs
    .filter((r) => t.has(`did.${r.type}`))
    .map((r) => t(`did.${r.type}`, { ad: String(r.payload.ad_name ?? ads.find((a) => a.id === r.ad_id)?.name ?? "") }));
  const tipType = weekRecs.find((r) => t.has(`tips.${r.type}`))?.type ?? "default";

  const metaArgs = { day: capitalize(formatLongDate(monday)), from: formatDayMonth(from), to: formatDayMonth(to) };
  return (
    <article className="wr">
      <Link href="/inzichten" className="wr-back">
        {t("back")}
      </Link>
      <span className="wr-meta">{isDemo ? t("metaExample", metaArgs) : t("meta", metaArgs)}</span>
      <h2 className="wr-sum">{summary}</h2>
      {[
        { label: t("thisWeek"), blocks: tileRow(week), dim: false },
        { label: t("lastWeek"), blocks: tileRow(prev), dim: true },
      ].map((row) => (
        <div key={row.label} className="wr-tilerow">
          <span className="as-small">{row.label}</span>
          <div className={["wr-tiles", row.dim && "wr-tiles--dim"].filter(Boolean).join(" ")}>
            {row.blocks.map(([k, v], i) => (
              <Fragment key={k}>
                {i > 0 ? (
                  <span aria-hidden="true" className="as-eurotile__arrow">
                    <Icon name="arrow" size={16} />
                  </span>
                ) : null}
                <div className={["wr-tile", i === row.blocks.length - 1 && "wr-tile--last"].filter(Boolean).join(" ")}>
                  <span className="as-eurotile__k">{k}</span>
                  <span className="wr-tile__v">{v}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      ))}
      <div className="wr-bw">
        {best ? (
          <div className="wr-box">
            <span className="as-small" style={{ fontSize: 12.5 }}>
              {t("best")}
            </span>
            <b>
              {best.code} · {best.name}
            </b>
            <span className="as-muted" style={{ fontSize: 14 }}>
              {describe(best, false)}
            </span>
          </div>
        ) : null}
        {worst && worst !== best ? (
          <div className="wr-box">
            <span className="as-small" style={{ fontSize: 12.5 }}>
              {t("worst")}
            </span>
            <b>
              {worst.code} · {worst.name}
            </b>
            <span className="as-muted" style={{ fontSize: 14 }}>
              {describe(worst, true)}
            </span>
          </div>
        ) : null}
      </div>
      {did.length ? (
        <section className="wr-did">
          <h3>{t("didTitle")}</h3>
          {did.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </section>
      ) : null}
      <aside className="wr-tip">
        <span className="wr-tip__icon">
          <Icon name="bulb" size={16} />
        </span>
        <span>
          <b>{t("tipTitle")}</b> {t(`tips.${tipType}`)}
        </span>
      </aside>
    </article>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
