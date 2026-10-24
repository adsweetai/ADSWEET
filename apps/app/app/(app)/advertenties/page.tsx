import { getTranslations } from "next-intl/server";
import { Icon, Tag } from "@adsweet/ui";
import { AdCardLink } from "@/components/ads/AdCardLink";
import { AdPanel } from "@/components/ads/AdPanel";
import { LinkButton } from "@/components/LinkButton";
import { RouteTabs } from "@/components/RouteTabs";
import { routeMetadata } from "@/lib/meta";
import { loadAdPanel, loadLibrary } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { LibraryFilters } from "./LibraryFilters";
import "../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("advertenties");

const TABS = ["ads", "beelden", "posts"] as const;
type Tab = (typeof TABS)[number];
const LABELS = ["winnaar", "geen", "verliezer", "vroeg"] as const;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; label?: string; fase?: string; soort?: string; campagne?: string; advertentie?: string }>;
}) {
  const ctx = await getContext();
  const t = await getTranslations("library");
  const tl = await getTranslations("ui.labels");
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "ads";
  const vm = await loadLibrary(ctx);
  const panel = sp.advertentie && /^[0-9a-f-]{36}$/.test(sp.advertentie) ? await loadAdPanel(ctx, sp.advertentie) : null;
  const ads = vm.ads.filter(
    (a) =>
      (!sp.label || a.label === sp.label) &&
      (!sp.fase || a.phase === sp.fase) &&
      (!sp.soort || a.kind === sp.soort) &&
      (!sp.campagne || a.campaignId === sp.campagne),
  );

  return (
    <div className="cp">
      <RouteTabs
        label={t("tabsLabel")}
        value={tab}
        items={TABS.map((tb) => ({ value: tb, label: t(`tabs.${tb}`), href: tb === "ads" ? "/advertenties" : `/advertenties?tab=${tb}` }))}
      />
      {tab === "ads" ? (
        <>
          <LibraryFilters
            filters={[
              { key: "label", label: t("filters.label"), options: [{ value: "", label: t("allLabels") }, ...LABELS.map((l) => ({ value: l, label: tl(l) }))] },
              {
                key: "fase",
                label: t("filters.phase"),
                options: [
                  { value: "", label: t("allPhases") },
                  { value: "top", label: "Top" },
                  { value: "middle", label: "Middle" },
                  { value: "bottom", label: "Bottom" },
                ],
              },
              {
                key: "soort",
                label: t("filters.kind"),
                options: [
                  { value: "", label: t("allKinds") },
                  { value: "foto", label: t("photo") },
                  { value: "video", label: t("video") },
                ],
              },
              { key: "campagne", label: t("filters.campaign"), options: [{ value: "", label: t("allCampaigns") }, ...vm.campaigns] },
            ]}
          />
          {ads.length ? (
            <div className="lib-grid">
              {ads.map((a) => (
                <AdCardLink key={a.id} ad={a} />
              ))}
            </div>
          ) : (
            <p className="as-muted">{t("empty")}</p>
          )}
          {ctx.canEdit ? (
            <LinkButton href="/testgrid" style={{ alignSelf: "flex-start" }}>
              {t("testgrid")}
            </LinkButton>
          ) : null}
        </>
      ) : null}
      {tab === "beelden" ? (
        vm.images.length ? (
          <div className="lib-imgs">
            {vm.images.map((im) => (
              <figure key={im.id} className="lib-img">
                <span className={im.thumb ? undefined : "as-hatch"}>
                  {im.thumb ? <img src={im.thumb} alt={im.name} /> : <Icon name={im.kind === "video" ? "video" : "image"} size={18} />}
                </span>
                <figcaption>
                  <b>{im.source}</b>
                  <span>{im.use}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="as-muted">{t("noImages")}</p>
        )
      ) : null}
      {tab === "posts" ? (
        <>
          <div className="lib-posts">
            {(t.raw("posts") as string[]).map((p) => (
              <div key={p} className="lib-post">
                <span>
                  <span className="as-thumb as-hatch" aria-hidden="true" />
                  <span>{p}</span>
                </span>
                <button type="button" className="as-btn as-btn--secondary" disabled aria-disabled="true">
                  {t("toAd")}
                </button>
              </div>
            ))}
          </div>
          <span className="as-small as-muted">
            <Tag>Later</Tag> {t("postsLater")}
          </span>
        </>
      ) : null}
      {panel ? <AdPanel vm={panel} canEdit={ctx.canEdit} /> : null}
    </div>
  );
}
