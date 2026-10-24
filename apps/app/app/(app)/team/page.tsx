import { getTranslations } from "next-intl/server";
import { routeMetadata } from "@/lib/meta";
import { loadRights } from "@/lib/server/agency";
import { getContext } from "@/lib/server/context";
import { loadTeam } from "@/lib/server/team";
import { SettingsFrame } from "../instellingen/SettingsFrame";
import { Rights } from "./Rights";
import { Team } from "./Team";
import "../klanten/klanten.css";

export const generateMetadata = routeMetadata("team");

// Team en rollen (App.dc.html#team). Bij een bureau: daaronder de rechten per klant (fase 9).
export default async function TeamPage() {
  const ctx = await getContext();
  const [team, rights] = await Promise.all([loadTeam(ctx), loadRights(ctx)]);
  const t = await getTranslations("agency.rights");
  return (
    <SettingsFrame current="team">
      <Team vm={team} />
      {rights ? (
        <section className="st-form" aria-labelledby="rights-title">
          <h3 id="rights-title" className="sb-h3">
            {t("title")}
          </h3>
          <p className="st-note">{t("intro")}</p>
          <Rights vm={rights} canEdit={ctx.role === "eigenaar"} />
        </section>
      ) : null}
    </SettingsFrame>
  );
}
