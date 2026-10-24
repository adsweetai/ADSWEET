import { redirect } from "next/navigation";
import { routeMetadata } from "@/lib/meta";
import { hasAI } from "@/lib/plans";
import { loadMakerContext } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { AddAds } from "./AddAds";
import "../../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("advertentiesToevoegen");

export default async function AddAdsPage({ searchParams }: { searchParams: Promise<{ campagne?: string }> }) {
  const ctx = await getContext();
  if (!ctx.canEdit || (ctx.agency && !ctx.inClient)) redirect("/campagnes");
  const sp = await searchParams;
  const m = await loadMakerContext(ctx, hasAI(ctx.plan));
  const initial = m.campaigns.some((c) => c.id === sp.campagne) ? sp.campagne! : null;
  return <AddAds m={m} initial={initial} />;
}
