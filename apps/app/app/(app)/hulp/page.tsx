import { env } from "@/lib/env";
import { routeMetadata } from "@/lib/meta";
import { getContext } from "@/lib/server/context";
import { loadHelp } from "@/lib/server/help";
import { Help } from "./Help";
import "./hulp.css";

export const generateMetadata = routeMetadata("hulp");

// Hulp (App.dc.html#hulp): zoeken, opnieuw uitleg, vragen, contact per plan en de status van de koppelingen.
export default async function HelpPage() {
  const ctx = await getContext();
  const vm = await loadHelp(ctx);
  return <Help vm={vm} siteUrl={env.siteUrl} />;
}
