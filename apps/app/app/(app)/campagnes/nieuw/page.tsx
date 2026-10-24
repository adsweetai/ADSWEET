import { redirect } from "next/navigation";
import { routeMetadata } from "@/lib/meta";
import { addDays, today } from "@/lib/clock";
import { hasAI } from "@/lib/plans";
import { loadMakerContext } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { Wizard } from "./Wizard";
import "../campagnes.css";

export const generateMetadata = routeMetadata("campagneNieuw");

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ strategie?: string }> }) {
  const ctx = await getContext();
  if (!ctx.canEdit || (ctx.agency && !ctx.inClient)) redirect("/campagnes");
  const sp = await searchParams;
  const m = await loadMakerContext(ctx, hasAI(ctx.plan));
  const day = today();
  const tomorrow = addDays(day, 1);
  const year = Number(day.slice(0, 4)) + (day.slice(5) > "12-24" ? 1 : 0);
  return <Wizard m={m} preset={sp.strategie === "feest" ? "feest" : null} tomorrow={tomorrow} xmasEnd={`${year}-12-24`} />;
}
