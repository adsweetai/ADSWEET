import { routeMetadata } from "@/lib/meta";
import { getContext } from "@/lib/server/context";
import { loadSubscription } from "@/lib/server/subscription";
import { SettingsFrame } from "../instellingen/SettingsFrame";
import { Subscription } from "./Subscription";

export const generateMetadata = routeMetadata("abonnement");

// Abonnement en facturen: staten proef, actief, mislukt, opgezegd en verlopen (App.dc.html#abonnement).
export default async function SubscriptionPage() {
  const ctx = await getContext();
  const vm = await loadSubscription(ctx);
  return (
    <SettingsFrame current="abonnement">
      <Subscription vm={vm} />
    </SettingsFrame>
  );
}
