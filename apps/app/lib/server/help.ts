import "server-only";
import { revalidatePath } from "next/cache";
import { must, type Plan } from "@adsweet/db";
import { formatDayMonth } from "@adsweet/ui";
import { hasPlan } from "@/lib/plans";
import { getDb, serviceDb } from "./auth";
import { getContext, type AppContext } from "./context";

// Hulp (App.dc.html#hulp): zoeken in de vragen, de rondleidingen opnieuw, contact per plan, een kwartaalcall of
// onboardinggesprek aanvragen (in calls, opgevolgd in Beheer) en de status van de koppelingen.

export type CallKind = "kwartaal" | "onboarding";
type CallState = { status: "te_plannen" | "gepland"; date: string | null } | null;

export interface HelpVM {
  plan: Plan;
  campaignId: string | null;
  quarterly: { allowed: boolean; call: CallState };
  onboarding: { allowed: boolean; call: CallState };
  status: { provider: "meta" | "google_ads"; state: "ok" | "expired" | "none" }[];
}

export async function loadHelp(ctx: AppContext): Promise<HelpVM> {
  const db = await getDb();
  const [camp, calls, conns] = await Promise.all([
    db
      .from("campaigns")
      .select("id")
      .eq("organization_id", ctx.org.id)
      .in("status", ["actief", "leerfase", "gepland"])
      .order("created_at")
      .limit(1)
      .maybeSingle()
      .then(must),
    db.from("calls").select().eq("organization_id", ctx.org.id).in("status", ["te_plannen", "gepland"]).then(must),
    db.from("connections").select("provider, status").eq("organization_id", ctx.org.id).in("provider", ["meta", "google_ads"]).then(must),
  ]);
  const callOf = (kind: CallKind): CallState => {
    const c = calls.find((x) => x.kind === kind);
    if (!c || c.status === "gedaan") return null;
    return { status: c.status, date: c.starts_at ? formatDayMonth(c.starts_at.slice(0, 10)) : null };
  };
  const stateOf = (provider: "meta" | "google_ads") => {
    const c = conns.filter((x) => x.provider === provider);
    if (provider === "meta" && c.length && ctx.demo.state === "koppeling") return "expired" as const;
    if (c.some((x) => x.status === "gekoppeld")) return "ok" as const;
    if (c.some((x) => x.status === "verlopen" || x.status === "fout")) return "expired" as const;
    return "none" as const;
  };
  return {
    plan: ctx.plan,
    campaignId: camp?.id ?? null,
    quarterly: { allowed: hasPlan(ctx.plan, "pro") && ctx.plan !== "agency", call: callOf("kwartaal") },
    onboarding: { allowed: ctx.org.founding, call: callOf("onboarding") },
    status: [
      { provider: "meta", state: stateOf("meta") },
      { provider: "google_ads", state: stateOf("google_ads") },
    ],
  };
}

/** Een gesprek aanvragen. AdSweet mailt om een moment te kiezen; de aanvraag staat in Beheer › Calls. */
export async function requestCall(kind: CallKind): Promise<{ ok: boolean }> {
  const ctx = await getContext();
  const help = await loadHelp(ctx);
  const allowed = kind === "kwartaal" ? help.quarterly.allowed : help.onboarding.allowed;
  if (!allowed) return { ok: false };
  if ((kind === "kwartaal" ? help.quarterly.call : help.onboarding.call) === null)
    // Wie mag kijken, mag ook een gesprek vragen (ook een lezer): daarom via de server, na de controle hierboven.
    await serviceDb().from("calls").insert({ organization_id: ctx.org.id, kind, status: "te_plannen" });
  revalidatePath("/hulp");
  return { ok: true };
}
