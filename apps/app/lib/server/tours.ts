import "server-only";
import { must } from "@adsweet/db";
import { nowIso } from "@/lib/clock";
import { getDb } from "./auth";
import { getContext } from "./context";

// Rondleidingen (app, campagne, wizard): de eerste keer vanzelf, daarna opnieuw via Hulp. Bewaard in user_tours.

export const TOURS = ["app", "campagne", "wizard"] as const;
export type TourName = (typeof TOURS)[number];

export async function seenTours(userId: string): Promise<TourName[]> {
  const db = await getDb();
  const rows = must(await db.from("user_tours").select("tour").eq("user_id", userId));
  return rows.map((r) => r.tour as TourName);
}

export async function markTourSeen(name: TourName) {
  if (!TOURS.includes(name)) return;
  const ctx = await getContext();
  const db = await getDb();
  await db.from("user_tours").upsert({ user_id: ctx.user.id, tour: name, seen_at: nowIso() }, { onConflict: "user_id,tour" });
}

/** "Bij je volgende bezoek zie je de uitleg opnieuw." */
export async function resetTours() {
  const ctx = await getContext();
  const db = await getDb();
  await db.from("user_tours").delete().eq("user_id", ctx.user.id);
}
