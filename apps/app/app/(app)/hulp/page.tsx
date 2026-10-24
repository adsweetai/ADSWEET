import { must } from "@adsweet/db";
import { TourCard } from "@/components/dot/TourCard";
import { routeMetadata } from "@/lib/meta";
import { getDb } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import "../campagnes/campagnes.css";

export const generateMetadata = routeMetadata("hulp");

// Hulp (App.dc.html#hulp). Fase 8: de rondleidingen opnieuw. De rest van Hulp volgt in fase 10.
export default async function HelpPage() {
  const ctx = await getContext();
  const db = await getDb();
  const camp = must(
    await db
      .from("campaigns")
      .select("id, status")
      .eq("organization_id", ctx.org.id)
      .in("status", ["actief", "leerfase", "gepland"])
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  );
  return (
    <div className="cp">
      <TourCard campaignId={camp?.id ?? null} />
    </div>
  );
}
