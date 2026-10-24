import { redirect } from "next/navigation";
import { routeMetadata } from "@/lib/meta";
import { loadAgency } from "@/lib/server/agency";
import { getContext } from "@/lib/server/context";
import { Clients } from "./Clients";
import "../campagnes/campagnes.css";
import "../vandaag/vandaag.css";
import "./klanten.css";

export const generateMetadata = routeMetadata("klanten");

export default async function ClientsPage() {
  const ctx = await getContext();
  // Alleen voor een bureau. Wie in een klant werkt, gaat eerst terug naar het bureau via de accountkiezer.
  if (!ctx.agency) redirect("/vandaag");
  const vm = await loadAgency({ ...ctx, inClient: false });
  if (!vm) redirect("/vandaag");
  return <Clients vm={vm} canEdit={ctx.canEdit && !ctx.inClient} />;
}
