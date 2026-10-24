import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FunnelBar, Icon, StatusBadge } from "@adsweet/ui";
import { AdCardLink } from "@/components/ads/AdCardLink";
import { AdPanel } from "@/components/ads/AdPanel";
import { LinkButton } from "@/components/LinkButton";
import { LogList } from "@/components/LogList";
import { RouteTabs } from "@/components/RouteTabs";
import { Label } from "@/components/ui";
import { routeMetadata } from "@/lib/meta";
import { loadAdPanel, loadCampaignDetail } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { currentPeriod } from "@/lib/server/period";
import { PauseButton, ScaleProposal, SettingsList } from "./DetailClient";
import "../campagnes.css";
import "../../logboek/logboek.css";

export const generateMetadata = routeMetadata("campagne");

const TABS = ["overzicht", "advertenties", "instellingen", "logboek"] as const;
type Tab = (typeof TABS)[number];

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; advertentie?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ctx = await getContext();
  const t = await getTranslations("campaign");
  const vm = await loadCampaignDetail(ctx, id, await currentPeriod());
  if (!vm) notFound();
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overzicht";
  const panel = sp.advertentie && /^[0-9a-f-]{36}$/.test(sp.advertentie) ? await loadAdPanel(ctx, sp.advertentie) : null;
  const href = (tb: Tab) => (tb === "overzicht" ? `/campagnes/${id}` : `/campagnes/${id}?tab=${tb}`);

  return (
    <div className="cp">
      <Link href="/campagnes" className="cp-back">
        {t("back")}
      </Link>
      <header className="cp-head">
        <div className="cp-head__text">
          <h2 className="cp-title">{vm.name}</h2>
          <span className="cp-meta">
            {vm.statusKind ? (
              <StatusBadge kind={vm.statusKind} size="sm">
                {vm.statusLabel}
              </StatusBadge>
            ) : (
              <span>{vm.statusLabel}</span>
            )}
            <span>{vm.kindLabel}</span>
            <span>{vm.budgetText}</span>
            {vm.status === "gepland" ? <span>{t("planned")}</span> : vm.since ? <span>{t("liveSince", { date: vm.since })}</span> : null}
          </span>
        </div>
        {ctx.canEdit && !vm.outside ? (
          <div className="cp-actions">
            <LinkButton href={`/advertenties/toevoegen?campagne=${id}`} variant="primary">
              {t("addAds")}
            </LinkButton>
            <LinkButton href={`/campagnes/${id}/delen`} icon="link">
              {t("preview")}
            </LinkButton>
            {vm.live || vm.paused ? <PauseButton id={id} paused={vm.paused} /> : null}
          </div>
        ) : null}
      </header>

      <RouteTabs label={t("tabsLabel")} value={tab} items={TABS.map((tb) => ({ value: tb, label: t(`tabs.${tb}`), href: href(tb) }))} />

      {tab === "overzicht" ? (
        <>
          <div className="cp-tile">
            {vm.tile.map((b, i) => (
              <span key={b.label} style={{ display: "contents" }}>
                {i > 0 ? (
                  <span className="cp-tile__arrow" aria-hidden="true">
                    <Icon name="arrow" size={16} />
                  </span>
                ) : null}
                <div className={["cp-tile__block", i === vm.tile.length - 1 && "cp-tile__block--last"].filter(Boolean).join(" ")}>
                  <span>{b.label}</span>
                  <b>{b.value}</b>
                </div>
              </span>
            ))}
          </div>
          <div className="cp-grid">
            <section className="cp-section">
              <h3 className="cp-h3">{t("structure")}</h3>
              <div className="cp-box">
                <span className="cp-tree__root">
                  <span className="cp-tree__mark" aria-hidden="true" />
                  {vm.structure.line}
                </span>
                <div className="cp-tree__sets">
                  {vm.structure.adSets.map((s) => (
                    <div key={s.id} className="cp-tree__set">
                      <span className="cp-tree__sethead">
                        <b>{s.name}</b>
                        {s.learning ? <span className="as-tag">{t("learning")}</span> : null}
                        {s.locked ? (
                          <span className="cp-lock" title={t("locked")}>
                            <Icon name="lock" size={15} />
                            {t("locked")}
                          </span>
                        ) : null}
                      </span>
                      <div className="cp-ads">
                        {s.ads.map((a) => (
                          <AdCardLink key={a.id} ad={a} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="cp-section">
                <span className="cp-small">{t("funnel")}</span>
                <FunnelBar counts={vm.funnel} format={(n) => t("funnelAds", { n })} missing={t("funnelMissing")} label={t("funnel")} />
              </div>
            </section>
            <aside className="cp-section">
              <h3 className="cp-h3">{t("budget")}</h3>
              <div className="cp-box cp-budget">
                <span className="cp-small">{t("now")}</span>
                <b className="cp-big">{vm.budgetText}</b>
                {vm.scale ? <ScaleProposal id={id} scale={vm.scale} canEdit={ctx.canEdit} /> : null}
              </div>
            </aside>
          </div>
        </>
      ) : null}

      {tab === "advertenties" ? (
        <div className="as-tablewrap">
          <table className="as-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>{t("cols.ad")}</th>
                <th>{t("cols.spend")}</th>
                <th>{vm.table.res}</th>
                <th>{vm.table.kpi}</th>
                <th className="cp-left">{t("cols.label")}</th>
              </tr>
            </thead>
            <tbody>
              {vm.table.rows.map((r) => (
                <tr key={r.id} className={r.off ? "cp-off" : undefined}>
                  <td>
                    <Link className="as-table__name" href={`${href("advertenties")}&advertentie=${r.id}`} scroll={false}>
                      {r.title}
                    </Link>
                    <span className="as-table__sub">{r.off ? t("adOff") : r.sub}</span>
                  </td>
                  <td>{r.spend}</td>
                  <td>{r.res}</td>
                  <td>{r.kpi}</td>
                  <td className="cp-left">
                    <Label kind={r.label} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "instellingen" ? <SettingsList id={id} rows={vm.settings} budget={vm.budget} canEdit={ctx.canEdit && !vm.outside} /> : null}

      {tab === "logboek" ? (
        <div className="lb">
          <LogList rows={vm.log} canEdit={ctx.canEdit} />
        </div>
      ) : null}

      {panel && panel.campaignId === id ? <AdPanel vm={panel} canEdit={ctx.canEdit} /> : null}
    </div>
  );
}
