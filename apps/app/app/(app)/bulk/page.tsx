import { redirect } from "next/navigation";
import { routeMetadata } from "@/lib/meta";
import { hasAI } from "@/lib/plans";
import { loadMakerContext } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { Bulk } from "./Bulk";
import "../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("bulk");

export default async function BulkPage() {
  const ctx = await getContext();
  if (!ctx.canEdit || (ctx.agency && !ctx.inClient)) redirect("/campagnes");
  const m = await loadMakerContext(ctx, hasAI(ctx.plan));
  return <Bulk m={m} demo={ctx.demo.enabled} />;
}
