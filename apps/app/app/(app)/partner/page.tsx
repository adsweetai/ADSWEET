import { getTranslations } from "next-intl/server";
import { CopyField } from "@/components/CopyField";
import { env } from "@/lib/env";
import { routeMetadata } from "@/lib/meta";
import { PLAN_LIMITS } from "@/lib/plans";
import { eur } from "@/lib/server/subscription";
import "../instellingen/instellingen.css";
import "./partner.css";

export const generateMetadata = routeMetadata("partner");

// Partnerportaal (App.dc.html#partnerportaal, Later). De cijfers zijn plaatshouders tot de partnerwerking er is.
export default async function PartnerPage() {
  const t = await getTranslations("partner");
  const link = `${env.siteUrl}/partner/[code]`;
  const pro = PLAN_LIMITS.pro.price;
  const share = Math.round(pro * 0.3 * 100) / 100;
  return (
    <div className="pp">
      <CopyField value={link.replace(/^https?:\/\//, "")} copyText={link} label={t("linkAria")} button={t("copy")} copied={t("copied")} />
      <div className="pp-kpis">
        {(t.raw("kpis") as [string, string][]).map(([k, v]) => (
          <div key={k} className="pp-kpi">
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="pp-example">
        <span className="pp-example__label">{t("exampleLabel")}</span>
        <span>{t("example", { price: eur(pro), month: eur(share), year: eur(Math.round(share * 12 * 100) / 100) })}</span>
      </div>
      <section className="sb-section">
        <h2 className="sb-h3">{t("payouts")}</h2>
        <p className="sb-empty">{t("payoutsNone")}</p>
      </section>
    </div>
  );
}
