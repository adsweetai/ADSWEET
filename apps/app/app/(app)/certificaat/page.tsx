import { getTranslations } from "next-intl/server";
import { ButtonLink, EmptyState, Logo } from "@adsweet/ui";
import { routeMetadata } from "@/lib/meta";
import { loadCertificates } from "@/lib/server/academy";
import { getContext } from "@/lib/server/context";
import { PrintButton } from "./PrintButton";
import "../academy/academy.css";

export const generateMetadata = routeMetadata("certificaat");

// Certificaat (App.dc.html#certificaat): een per afgerond traject van de Academy.
export default async function CertificatePage() {
  const ctx = await getContext();
  const certs = await loadCertificates(ctx);
  const t = await getTranslations("academy.cert");
  const tc = await getTranslations("common");
  if (!certs.length)
    return (
      <div className="sh-empty">
        <EmptyState text={t("empty")} action={<ButtonLink href="/academy">{t("emptyBtn")}</ButtonLink>} />
      </div>
    );
  return (
    <div className="ct">
      {certs.map((c) => (
        <div key={c.n} className="ct-card">
          <div className="ct-top">
            <Logo height={19} />
            <img src="/icon/app-icon-180.png" alt={t("seal")} className="ct-seal" width={72} height={72} />
          </div>
          <div className="ct-mid">
            <span className="ct-eyebrow">{t("eyebrow")}</span>
            <b>{t("title", { name: c.name, n: c.n, track: c.track })}</b>
            <span className="as-muted">{t("sub", { count: c.count, date: c.date })}</span>
          </div>
          <span className="ct-slogan">{tc.rich("slogan", { sweet: (chunks) => <span className="ct-sweet">{chunks}</span> })}</span>
        </div>
      ))}
      <div className="ct-print">
        <PrintButton label={t("print")} />
      </div>
    </div>
  );
}
