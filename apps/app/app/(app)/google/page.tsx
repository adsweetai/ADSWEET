import { getTranslations } from "next-intl/server";
import { routeMetadata } from "@/lib/meta";
import "../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("google");

/** Google Ads-campagne (V1): dezelfde stappen als de wizard. De inhoud komt uit het Google-playbook van PJ. */
export default async function GooglePage() {
  const t = await getTranslations("google");
  const tw = await getTranslations("wizard");
  return (
    <div className="cp cp--narrow">
      <p className="cp-intro">{t("intro")}</p>
      <ol className="gg-steps">
        {(tw.raw("steps") as string[]).map((s, i) => (
          <li key={s}>
            <span>{i + 1}</span>
            <span>
              <b>{s}</b>
              <span>{t("placeholder")}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
