import { getTranslations } from "next-intl/server";
import { EmptyPage } from "@/components/EmptyPage";
import { routeMetadata } from "@/lib/meta";
import { loadRights } from "@/lib/server/agency";
import { getContext } from "@/lib/server/context";
import { Rights } from "./Rights";
import "../campagnes/campagnes.css";
import "../klanten/klanten.css";

export const generateMetadata = routeMetadata("team");

// Team en rollen. Fase 9: rechten per klant voor een bureau. Teamleden uitnodigen en rollen volgen in fase 10.
export default async function TeamPage() {
  const ctx = await getContext();
  const rights = await loadRights(ctx);
  if (!rights) return <EmptyPage />;
  const t = await getTranslations("agency.rights");
  return (
    <div className="cp">
      <section className="cp-section">
        <h2 className="cp-h3">{t("title")}</h2>
        <p className="as-muted" style={{ margin: 0 }}>
          {t("intro")}
        </p>
        <Rights vm={rights} canEdit={ctx.role === "eigenaar"} />
      </section>
    </div>
  );
}
