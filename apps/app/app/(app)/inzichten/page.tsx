import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon, Tag } from "@adsweet/ui";
import { AdPanel } from "@/components/ads/AdPanel";
import { Sparkline, TrendChart, type ChartTone } from "@/components/charts";
import { RouteTabs } from "@/components/RouteTabs";
import { GatePanel, Label } from "@/components/ui";
import { routeMetadata } from "@/lib/meta";
import { PLAN_NAME, hasPlan } from "@/lib/plans";
import { loadAdPanel, loadCampaignDetail } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { loadInsights, type Tile } from "@/lib/server/insights";
import { currentPeriod } from "@/lib/server/period";
import { ReportActions } from "./ReportActions";
import "../campagnes/campagnes.css";
import "./inzichten.css";

export const generateMetadata = routeMetadata("inzichten");

const TABS = ["overzicht", "advertenties", "doelgroepen", "benchmarks", "rapporten"] as const;
type Tab = (typeof TABS)[number];

function Tiles({ tiles, big }: { tiles: Tile[]; big?: boolean }) {
  return (
    <div className={big ? "iz-tiles iz-tiles--big" : "iz-tiles"}>
      {tiles.map((k) => (
        <div key={k.k} className="iz-tile">
          <span className="iz-tile__k">{k.k}</span>
          <span className={["iz-tile__v", k.tone === "ok" && big ? "iz-ok" : ""].join(" ")}>{k.v}</span>
          {k.sub ? <span className="iz-tile__sub">{k.sub}</span> : null}
          {k.series ? <Sparkline values={k.series} tone={(k.tone ?? "ink") as ChartTone} /> : null}
        </div>
      ))}
    </div>
  );
}

function Section({ title, sub, dot, children }: { title: string; sub?: string; dot: string; children: React.ReactNode }) {
  return (
    <section className="iz-section">
      <div className="iz-section__head">
        <h2>
          <span className={`iz-dot as-dotfill--${dot}`} aria-hidden="true" />
          {title}
        </h2>
        {sub ? <span>{sub}</span> : null}
      </div>
      {children}
    </section>
  );
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ tab?: string; advertentie?: string }> }) {
  const ctx = await getContext();
  const t = await getTranslations("insights");
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overzicht";
  const live = hasPlan(ctx.plan, "pro");
  const period = await currentPeriod();
  // Starter krijgt alleen het weekrapport: de cijfers worden dan niet eens berekend.
  const vm = live ? await loadInsights(ctx, period) : null;
  const detail = live && vm?.mainCampaignId && tab === "advertenties" ? await loadCampaignDetail(ctx, vm.mainCampaignId, period) : null;
  const panel = sp.advertentie && /^[0-9a-f-]{36}$/.test(sp.advertentie) ? await loadAdPanel(ctx, sp.advertentie) : null;
  const href = (tb: Tab) => (tb === "overzicht" ? "/inzichten" : `/inzichten?tab=${tb}`);
  const gate = <GatePanel plan={PLAN_NAME.pro} text={t("gate")} isStatic />;

  return (
    <div className="cp iz">
      <div className="iz-bar">
        <RouteTabs label={t("tabsLabel")} value={tab} items={TABS.map((tb) => ({ value: tb, label: t(`tabs.${tb}`), href: href(tb) }))} />
      </div>

      {tab === "overzicht" ? (
        !vm ? (
          <div className="iz-gated">
            <div className="iz-skeleton" aria-hidden="true">
              <div className="iz-tiles iz-tiles--big">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="iz-tile">
                    <span className="iz-tile__k">—</span>
                    <span className="iz-tile__v">—</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="iz-gate">
              {gate}
              <Link className="as-link" href="/weekrapport/laatste">
                {t("toReport")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="iz-note">
              <b>{t("allFromMeta")}</b> {vm.periodLabel}
              {!vm.hasData ? ` · ${t("noData")}` : ""}
            </div>
            <Tiles tiles={vm.top} big />
            <Section title={t("traffic")} sub={t("trafficSub")} dot="hemel">
              <Tiles tiles={vm.traffic} />
            </Section>
            <Section title={t("funnel")} sub={vm.kind === "sales" ? t("funnelSub") : t("funnelSubLeads")} dot="munt">
              <div className="iz-funnel">
                {vm.funnel.map((f) => (
                  <div key={f.k} className="iz-funnel__row">
                    <span className="iz-funnel__k">{f.k}</span>
                    <span className="iz-funnel__v">{f.v}</span>
                    <span className="as-small as-muted">{f.cost}</span>
                    {f.rate ? <span className="as-small">{f.rate}</span> : <span />}
                    <span className={`iz-funnel__bar iz-funnel__bar--${f.phase}`} style={{ width: `${f.width}%` }} aria-hidden="true" />
                  </div>
                ))}
              </div>
            </Section>
            <Section title={t("creatives")} sub={t("creativesSub")} dot="roos">
              <Tiles tiles={vm.creative} />
            </Section>
            <Section title={t("delivery")} sub={t("deliverySub")} dot="citroen">
              <Tiles tiles={vm.delivery} />
            </Section>
            <Section title={t("campaigns")} dot="bes">
              <div className="as-tablewrap">
                <table className="as-table iz-table">
                  <thead>
                    <tr>
                      {(t.raw("campCols") as string[]).map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vm.campaigns.map((c) => (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td>
                          <span className={c.live ? "iz-pill iz-pill--ok" : "iz-pill"}>{c.status}</span>
                        </td>
                        <td>{c.spend}</td>
                        <td>{c.rev}</td>
                        <td className={`iz-${c.roasTone}`}>{c.roas}</td>
                        <td>{c.impr}</td>
                        <td>{c.clicks}</td>
                        <td>{c.ctr}</td>
                        <td>{c.cpc}</td>
                        <td>{c.conv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
            <Section title={t("trends")} sub={vm.rangeLabel} dot="perzik">
              <div className="iz-trends">
                {vm.trends.map((tr) => (
                  <div key={tr.k} className="iz-trend">
                    <div className="iz-trend__head">
                      <span>
                        <span className="as-small as-muted">{tr.k}</span>
                        <b>{tr.v}</b>
                      </span>
                      <span className="iz-legend">
                        <span>
                          <span className={`iz-swatch iz-swatch--${tr.tone}`} />
                          {tr.k}
                        </span>
                        <span>
                          <span className="iz-swatch iz-swatch--bar" />
                          {t("spend")}
                        </span>
                      </span>
                    </div>
                    <div role="img" aria-label={t("trendAria", { k: tr.k })}>
                      <TrendChart
                        line={tr.series}
                        bars={tr.spend}
                        labels={tr.days}
                        refLine={tr.ref}
                        refLabel={tr.ref ? t("breakEvenShort", { v: String(tr.ref).replace(".", ",") }) : undefined}
                        format={tr.format}
                        tone={tr.tone}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )
      ) : null}

      {tab === "advertenties" ? (
        !live ? (
          gate
        ) : (
          <>
            {detail ? (
              <div className="as-tablewrap">
                <table className="as-table" style={{ minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th>{t("adCols.ad")}</th>
                      <th>{t("adCols.spend")}</th>
                      <th>{detail.table.res}</th>
                      <th>{detail.table.kpi}</th>
                      <th>{t("adCols.score")}</th>
                      <th className="cp-left">{t("adCols.label")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.table.rows.map((r) => (
                      <tr key={r.id} className={r.off ? "cp-off" : undefined}>
                        <td>
                          <Link className="as-table__name" href={`/inzichten?tab=advertenties&advertentie=${r.id}`} scroll={false}>
                            {r.title}
                          </Link>
                        </td>
                        <td>{r.spend}</td>
                        <td>{r.res}</td>
                        <td>{r.kpi}</td>
                        <td className="as-muted">[V1]</td>
                        <td className="cp-left">
                          <Label kind={r.label} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="as-muted">{t("noCampaign")}</p>
            )}
            <section className="iz-box">
              <b>{t("creativeTitle")}</b>
              {vm?.formats.length ? (
                <div className="iz-formats">
                  {vm.formats.map((f) => (
                    <div key={f.n}>
                      <span>{f.n}</span>
                      <span className="iz-format__bar">
                        <span style={{ width: `${f.width}%` }} />
                      </span>
                      <span className="as-small">{f.v}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <span className="as-small as-muted">{t("creativeNote")}</span>
            </section>
          </>
        )
      ) : null}

      {tab === "doelgroepen" ? (
        <p className="as-muted">
          <Tag>Later</Tag> {t("audiences")}
        </p>
      ) : null}

      {tab === "benchmarks" ? (
        <div className="iz-bench">
          <span className="as-small as-muted">{t("benchNote")}</span>
          {(
            [
              [t("roas"), vm?.top.find((x) => x.k === t("roas"))?.v],
              [vm?.kind === "leads" ? t("cpl") : t("cpa"), vm?.top.find((x) => x.k === t("cpa") || x.k === t("cpl"))?.v],
              [t("linkCtr"), vm?.creative.find((x) => x.k === t("linkCtr"))?.v],
            ] as [string, string | undefined][]
          ).map(([k, you]) => (
            <div key={k} className="iz-bench__row">
              <span>{k}</span>
              <b>{you ?? "[jouw cijfer]"}</b>
              <span className="as-muted">[mediaan sector]</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "rapporten" ? (
        <div className="iz-reports">
          <Link href="/weekrapport/laatste" className="iz-report">
            <span className="ob-stack">
              <b>{t("weekReport")}</b>
              <span className="as-small as-muted">{t("weekReportSub")}</span>
            </span>
            <Icon name="arrow" size={16} />
          </Link>
          {(
            [
              [t("sched.week"), t("sched.weekSub"), t("on"), false],
              [t("sched.month"), t("sched.monthSub"), t("off"), false],
              [t("sched.white"), t("sched.whiteSub"), hasPlan(ctx.plan, "agency") ? t("setup") : "Agency", !hasPlan(ctx.plan, "agency")],
            ] as [string, string, string, boolean][]
          ).map(([title, sub, v, lock]) => (
            <div key={title} className="iz-sched">
              <span className="ob-stack">
                <span>{title}</span>
                <span className="as-small as-muted">{sub}</span>
              </span>
              <span className="iz-sched__v">
                {lock ? <Icon name="lock" size={13} /> : null}
                {v}
              </span>
            </div>
          ))}
          <ReportActions />
          <span className="as-small as-muted">{t("customLater")}</span>
        </div>
      ) : null}

      {panel ? <AdPanel vm={panel} canEdit={ctx.canEdit} /> : null}
    </div>
  );
}
