import { getTranslations } from "next-intl/server";
import { routeMetadata } from "@/lib/meta";
import "../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("catalogus");

/** Catalogus-advertenties (Later): voor webshops met een gekoppelde Shopify-catalogus. */
export default async function CatalogPage() {
  const t = await getTranslations("catalog");
  return (
    <div className="cp cp--narrow">
      <p className="cp-intro">{t("intro")}</p>
      <ul className="ct-list">
        {(t.raw("items") as string[]).map((p) => (
          <li key={p}>
            <label>
              <input type="checkbox" aria-label={p} disabled />
              <span className="as-thumb as-hatch" aria-hidden="true" />
              <span>{p}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
