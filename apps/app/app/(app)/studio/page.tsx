import { getTranslations } from "next-intl/server";
import { EmptyPage } from "@/components/EmptyPage";
import { routeMetadata } from "@/lib/meta";
import { hasAI } from "@/lib/plans";
import { getContext } from "@/lib/server/context";
import { loadStudio } from "@/lib/server/studio";
import { Studio } from "./Studio";
import "../campagnes/campagnes.css";
import "./studio.css";

export const generateMetadata = routeMetadata("studio");

export default async function StudioPage() {
  const ctx = await getContext();
  const t = await getTranslations("gates");
  // Starter: de server toont alleen het plan-paneel en laadt niets van Studio.
  if (!hasAI(ctx.plan)) return <EmptyPage min="pro" gateText={t("studio")} />;
  const vm = await loadStudio(ctx);
  if (!vm) return <EmptyPage min="pro" gateText={t("studio")} />;
  return <Studio vm={vm} />;
}
