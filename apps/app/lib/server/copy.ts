import "server-only";
import { must } from "@adsweet/db";
import { hasAI } from "@/lib/plans";
import { getDb } from "./auth";
import { getContext } from "./context";

/**
 * Tekstvoorstellen voor een advertentie (Pro en hoger). Nu vertrekken ze van de teksten van je eigen advertenties;
 * in fase 7 schrijft Claude hier nieuwe varianten op basis van je bedrijfsprofiel en de funnelfase.
 * De gate zit op de server: Starter krijgt geen voorstellen.
 */
export async function suggestPrimaryTexts(round: number): Promise<{ ok: true; texts: string[] } | { ok: false }> {
  const ctx = await getContext();
  if (!hasAI(ctx.plan)) return { ok: false };
  const db = await getDb();
  const ads = must(await db.from("ads").select("primary_text, variants, label").eq("organization_id", ctx.org.id));
  const pool = [...new Set(ads.flatMap((a) => [...(a.variants?.primary_text ?? []), a.primary_text ?? ""]).filter(Boolean))];
  if (!pool.length) return { ok: true, texts: [] };
  const shift = round % pool.length;
  return { ok: true, texts: [...pool.slice(shift), ...pool.slice(0, shift)].slice(0, 3) };
}
