import "server-only";
import { must } from "@adsweet/db";
import { nowIso } from "@/lib/clock";
import { getDb } from "./auth";
import { assertCanEdit, assertPlan, getContext, type AppContext } from "./context";
import { demoSiteOf, type DemoSite } from "./demo-sites";

// Concurrenten (vanaf Pro, V1): uit de openbare advertentiebibliotheek van Meta. Die ophalen gebeurt vanaf fase 13;
// tot dan tonen we je concurrenten met plaatshouders, en in de demo de voorbeelden uit het prototype.

export interface CompetitorsVM {
  names: string[];
  example: boolean;
  notes: string[] | null;
  personas: NonNullable<DemoSite["competitors"]>["personas"] | null;
}

export async function loadCompetitors(ctx: AppContext): Promise<CompetitorsVM> {
  const db = await getDb();
  const bp = must(await db.from("business_profiles").select("website, competitors").eq("organization_id", ctx.org.id).maybeSingle());
  const demo = demoSiteOf(bp?.website)?.competitors ?? null;
  const names = bp?.competitors ?? [];
  return {
    names: names.length ? names : ["Concurrent A", "Concurrent B", "Concurrent C"],
    example: !names.length,
    notes: demo?.notes ?? null,
    personas: demo?.personas ?? null,
  };
}

export async function addCompetitor(name: string) {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  assertCanEdit(ctx);
  const clean = name.trim().slice(0, 120);
  if (!clean) return { ok: false };
  const db = await getDb();
  const bp = must(await db.from("business_profiles").select("competitors").eq("organization_id", ctx.org.id).maybeSingle());
  const list = [...new Set([...(bp?.competitors ?? []), clean])].slice(0, 20);
  if (bp) await db.from("business_profiles").update({ competitors: list, updated_at: nowIso() }).eq("organization_id", ctx.org.id);
  else await db.from("business_profiles").insert({ organization_id: ctx.org.id, competitors: list });
  return { ok: true };
}
