import { getTranslations } from "next-intl/server";
import { CopyField } from "@/components/CopyField";
import { routeMetadata } from "@/lib/meta";
import { getContext } from "@/lib/server/context";
import { loadReferral } from "@/lib/server/referral";
import { Row, Rows } from "../instellingen/Row";
import { SettingsFrame } from "../instellingen/SettingsFrame";

export const generateMetadata = routeMetadata("doorverwijzen");

// Doorverwijzen (App.dc.html#doorverwijzen): je persoonlijke link en wie zich ermee aanmeldde.
export default async function ReferralPage() {
  const ctx = await getContext();
  const vm = await loadReferral(ctx);
  const t = await getTranslations("referral");
  return (
    <SettingsFrame current="doorverwijzen">
      <p className="rf-intro">{t("intro")}</p>
      <CopyField value={vm.link} copyText={vm.url} label={t("linkAria")} button={t("copy")} copied={t("copied")} />
      <div className="rf-list">
        {vm.rows.length ? (
          <Rows>
            {vm.rows.map((r) => (
              <Row
                key={r.id}
                title={r.name || t("someone")}
                sub={[r.signedUp ? t("signedUp", { date: r.signedUp }) : null, r.freeFrom ? t("freeFrom", { date: r.freeFrom }) : t("freePending")]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </Rows>
        ) : (
          <p>{t("none")}</p>
        )}
        <span className="rf-foot">{t("foot")}</span>
      </div>
    </SettingsFrame>
  );
}
