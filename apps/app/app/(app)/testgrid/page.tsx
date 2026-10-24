import { redirect } from "next/navigation";
import { routeMetadata } from "@/lib/meta";
import { hasAI } from "@/lib/plans";
import { loadMakerContext } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { Testgrid } from "./Testgrid";
import "../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("testgrid");

export default async function TestgridPage() {
  const ctx = await getContext();
  if (!ctx.canEdit || (ctx.agency && !ctx.inClient)) redirect("/advertenties");
  const m = await loadMakerContext(ctx, hasAI(ctx.plan));
  return <Testgrid m={m} />;
}
