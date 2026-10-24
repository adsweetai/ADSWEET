import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@adsweet/ui";
import { LinkButton } from "@/components/LinkButton";
import { Status } from "@/components/ui";
import { routeMetadata } from "@/lib/meta";
import { loadCampaignList } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { currentPeriod } from "@/lib/server/period";
import "./campagnes.css";

export const generateMetadata = routeMetadata("campagnes");

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ leeg?: string }> }) {
  const ctx = await getContext();
  const t = await getTranslations("campaigns");
  const sp = await searchParams;
  const forceEmpty = ctx.demo.enabled && sp.leeg === "1";
  const rows = forceEmpty ? [] : await loadCampaignList(ctx, await currentPeriod());
  const overview = !!ctx.agency && !ctx.inClient;

  return (
    <div className="cp">
      <div className="cp-bar">
        {ctx.canEdit && !overview ? (
          <div className="cp-actions">
            <LinkButton href="/campagnes/nieuw" variant="primary" icon="plus">
              {t("new")}
            </LinkButton>
            <LinkButton href="/advertenties/toevoegen">{t("addAds")}</LinkButton>
            <LinkButton href="/bulk">{t("bulk")}</LinkButton>
          </div>
        ) : (
          <span />
        )}
        {ctx.demo.enabled ? (
          <Link className="cp-demo" href={forceEmpty ? "/campagnes" : "/campagnes?leeg=1"} aria-pressed={forceEmpty} replace scroll={false}>
            {t("demoEmpty")}
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          text={t("empty")}
          action={
            ctx.canEdit && !overview ? (
              <LinkButton href="/campagnes/nieuw" variant="primary">
                {t("emptyCta")}
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <div className="as-tablewrap">
          <table className="as-table cp-table">
            <thead>
              <tr>
                <th>{t("cols.name")}</th>
                <th className="cp-left">{t("cols.status")}</th>
                <th className="cp-left">{t("cols.kind")}</th>
                <th className="cp-left">{t("cols.channel")}</th>
                <th>{t("cols.budget")}</th>
                <th>{t("cols.result")}</th>
                <th className="cp-left">
                  <span className="as-sr">{t("cols.status")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.client ? <span className="cp-client">{r.client}</span> : null}
                    {overview ? (
                      <span className="cp-name">{r.name}</span>
                    ) : (
                      <Link className="cp-name" href={`/campagnes/${r.id}`}>
                        {r.name}
                      </Link>
                    )}
                    {r.outside ? (
                      <span className="cp-outside">
                        <b>{t("outside")}</b>
                        {r.deviations.map((d) => (
                          <span key={d}>{t("deviates", { what: d })}</span>
                        ))}
                      </span>
                    ) : null}
                  </td>
                  <td className="cp-left">{r.status}</td>
                  <td className="cp-left">{r.kind}</td>
                  <td className="cp-left">{r.channel}</td>
                  <td>{r.budget}</td>
                  <td>{r.result}</td>
                  <td className="cp-left">{r.badge ? <Status kind={r.badge.kind} size="sm" /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
