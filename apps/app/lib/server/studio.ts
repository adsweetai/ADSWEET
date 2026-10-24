import "server-only";
import { getTranslations } from "next-intl/server";
import { must } from "@adsweet/db";
import { getDb, serviceDb } from "./auth";
import { assertCanEdit, assertPlan, getContext, type AppContext } from "./context";
import { creditsFor, spendCredits, type Credits } from "./credits";
import { demoSiteOf } from "./demo-sites";

// Studio (vanaf Pro): beelden, teksten, hooks en videoscripts. De gate zit op de server: Starter krijgt hier niets.
// Claude en een beeldmodel komen in fase 13; tot dan geeft Studio de voorbeelden uit de demo of plaatshouders terug.

export type StudioKind = "beeld" | "tekst" | "hooks" | "script";
export const STUDIO_COST: Record<StudioKind, number> = { beeld: 10, tekst: 1, hooks: 2, script: 3 };

export interface StudioVM {
  credits: Credits;
  context: string[];
}

export async function loadStudio(ctx: AppContext): Promise<StudioVM | null> {
  const credits = await creditsFor(ctx);
  if (!credits) return null;
  const t = await getTranslations("studio");
  const db = await getDb();
  const bp = must(await db.from("business_profiles").select().eq("organization_id", ctx.org.id).maybeSingle());
  const demo = demoSiteOf(bp?.website);
  const context = demo?.studio?.context ?? [
    t("ctxBusiness", { name: ctx.org.name }),
    t("ctxPhase"),
    t("ctxTone", { tone: bp?.tone?.length ? bp.tone.join(", ") : "[toon]" }),
  ];
  return { credits, context };
}

export async function generateStudio(
  kind: StudioKind,
): Promise<{ ok: true; results: string[]; left: number } | { ok: false; error: "credits" | "plan"; left?: number; cost?: number }> {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  assertCanEdit(ctx);
  if (!(kind in STUDIO_COST)) return { ok: false, error: "plan" };
  const cost = STUDIO_COST[kind];
  if (!(await spendCredits(ctx, cost, `studio_${kind}`))) {
    const c = await creditsFor(ctx);
    return { ok: false, error: "credits", left: c?.left ?? 0, cost };
  }
  const t = await getTranslations("studio");
  const db = await getDb();
  const bp = must(await db.from("business_profiles").select("website").eq("organization_id", ctx.org.id).maybeSingle());
  const demo = demoSiteOf(bp?.website)?.studio;
  const results = demo?.[kind] ?? (t.raw(`placeholder.${kind}`) as string[]);
  const left = (await creditsFor(ctx))?.left ?? 0;
  return { ok: true, results, left };
}

/** Bewaar een AI-beeld bij je beelden (bibliotheek, bron Studio). */
export async function saveStudioImage(description: string) {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  assertCanEdit(ctx);
  const name = description.split("·").pop()?.trim().slice(0, 80) || "studio-beeld";
  await serviceDb()
    .from("media")
    .insert({ organization_id: ctx.org.id, name: `studio · ${name}`, kind: "foto", source: "studio" });
}
