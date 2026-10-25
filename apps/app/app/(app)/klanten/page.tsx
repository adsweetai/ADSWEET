import { redirect } from "next/navigation";
import { routeMetadata } from "@/lib/meta";
import { loadAgency } from "@/lib/server/agency";
import { getContext } from "@/lib/server/context";
import { metaStatus } from "@/lib/server/meta/connect";
import { Clients } from "./Clients";
import "../campagnes/campagnes.css";
import "../vandaag/vandaag.css";
import "./klanten.css";

export const generateMetadata = routeMetadata("klanten");

// Klanten uit Meta toevoegen haalt per klant 30 dagen cijfers op.
export const maxDuration = 60;

export default async function ClientsPage() {
  const ctx = await getContext();
  // Alleen voor een bureau. Wie in een klant werkt, gaat eerst terug naar het bureau via de accountkiezer.
  if (!ctx.agency) redirect("/vandaag");
  const vm = await loadAgency({ ...ctx, inClient: false });
  if (!vm) redirect("/vandaag");
  const canEdit = ctx.canEdit && !ctx.inClient;
  const meta = await metaStatus(ctx.user.id);
  return <Clients vm={vm} canEdit={canEdit} metaImport={canEdit && meta.live} />;
}
