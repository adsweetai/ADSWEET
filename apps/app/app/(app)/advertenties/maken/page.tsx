import { redirect } from "next/navigation";
import { must } from "@adsweet/db";
import type { Uploaded } from "@/components/ads/upload";
import { routeMetadata } from "@/lib/meta";
import { hasAI } from "@/lib/plans";
import { getDb } from "@/lib/server/auth";
import { loadMakerContext, mediaUrl } from "@/lib/server/campaigns";
import { getContext } from "@/lib/server/context";
import { AdMaker } from "./AdMaker";
import "../../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("advertentieMaken");

const UUID = /^[0-9a-f-]{36}$/;

export default async function MakeAdPage({ searchParams }: { searchParams: Promise<{ campagne?: string; adset?: string; ok?: string; media?: string }> }) {
  const ctx = await getContext();
  if (!ctx.canEdit || (ctx.agency && !ctx.inClient)) redirect("/campagnes");
  const sp = await searchParams;
  const m = await loadMakerContext(ctx, hasAI(ctx.plan));
  const campaign = m.campaigns.find((c) => c.id === sp.campagne) ?? m.campaigns[0];
  if (!campaign) redirect("/advertenties/toevoegen");
  const adSet = sp.adset && UUID.test(sp.adset) ? (campaign.adSets.find((s) => s.id === sp.adset) ?? null) : null;
  const db = await getDb();
  const media = must(await db.from("media").select().eq("organization_id", ctx.org.id).order("created_at", { ascending: false }));
  const toFile = (x: (typeof media)[number]): Uploaded => ({
    id: x.id,
    name: x.name ?? "",
    kind: x.kind,
    url: mediaUrl(x.id, x.storage_path),
    width: x.width,
    height: x.height,
    duration: x.duration_s,
  });
  const first = (sp.media ?? "").split(",").find((id) => UUID.test(id));
  const initial = first ? (media.find((x) => x.id === first) ?? null) : null;
  return (
    <AdMaker
      m={m}
      campaignId={campaign.id}
      adSet={adSet}
      confirmed={!!adSet && sp.ok === "1"}
      initialFile={initial ? toFile(initial) : null}
      library={media.map(toFile)}
      demo={ctx.demo.enabled}
    />
  );
}
