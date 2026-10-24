import { routeMetadata } from "@/lib/meta";
import { loadAutopilot } from "@/lib/server/autopilot";
import { getContext } from "@/lib/server/context";
import { Autopilot } from "./Autopilot";
import "../campagnes/campagnes.css";
import "../studio/studio.css";

export const generateMetadata = routeMetadata("autopilot");

export default async function AutopilotPage() {
  const ctx = await getContext();
  return <Autopilot vm={await loadAutopilot(ctx)} canEdit={ctx.canEdit} />;
}
