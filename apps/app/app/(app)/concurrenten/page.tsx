import { getTranslations } from "next-intl/server";
import { EmptyPage } from "@/components/EmptyPage";
import { routeMetadata } from "@/lib/meta";
import { hasAI } from "@/lib/plans";
import { loadCompetitors } from "@/lib/server/competitors";
import { getContext } from "@/lib/server/context";
import { Competitors } from "./Competitors";
import "../campagnes/campagnes.css";
import "../studio/studio.css";

export const generateMetadata = routeMetadata("concurrenten");

export default async function CompetitorsPage() {
  const ctx = await getContext();
  const t = await getTranslations("gates");
  if (!hasAI(ctx.plan)) return <EmptyPage min="pro" gateText={t("concurrenten")} />;
  return <Competitors vm={await loadCompetitors(ctx)} canEdit={ctx.canEdit} />;
}
