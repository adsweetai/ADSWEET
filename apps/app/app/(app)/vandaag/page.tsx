import { redirect } from "next/navigation";
import { routeMetadata } from "@/lib/meta";
import { getContext } from "@/lib/server/context";
import { currentPeriod } from "@/lib/server/period";
import { buildToday, type Variant } from "@/lib/server/today";
import { VandaagView } from "./VandaagView";
import "./vandaag.css";

export const generateMetadata = routeMetadata("vandaag");

const VARIANTS: Variant[] = ["normaal", "dag1", "rapport", "leeg"];

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const ctx = await getContext();
  // Een bureau begint bij zijn klanten.
  if (ctx.agency && !ctx.inClient) redirect("/klanten");
  const sp = await searchParams;
  const forced = ctx.demo.enabled && VARIANTS.includes(sp.variant as Variant) ? (sp.variant as Variant) : undefined;
  const vm = await buildToday(ctx, await currentPeriod(), forced);
  return <VandaagView vm={vm} />;
}
