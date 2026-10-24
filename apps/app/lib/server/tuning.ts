import "server-only";
import { must, type Goal, type Json } from "@adsweet/db";
import { nowIso } from "@/lib/clock";
import { isDemo } from "@/lib/env";
import { hasAI } from "@/lib/plans";
import { getDb, serviceDb } from "./auth";
import { mediaUrl } from "./campaigns";
import { assertCanEdit, getContext, type AppContext } from "./context";
import { demoSiteOf } from "./demo-sites";
import { readAndSaveWebsite } from "./onboarding";
import { storeFile } from "./storage";

// Het onboardingpaneel "Stem AdSweet af op je zaak" (Onboardingpaneel.dc.html): 8 stappen voor wie al klant is.
// Elke stap bewaart meteen; een optionele stap kan je overslaan.

export const TUNING_STEPS = 8;
export const OPTIONAL = new Set([2, 3]);

export interface TuningVM {
  step: number;
  done: number[];
  skipped: number[];
  orgName: string;
  site: string;
  found: { k: string; v: string }[] | null;
  brand: { file: string | null; colors: string[]; font: string; logo: boolean; neverSay: string };
  docs: { id: string; name: string; category: string; status: string }[];
  images: { id: string; name: string; url: string | null; kind: "foto" | "video"; source: string }[];
  offer: { sells: string; audience: string; differentiator: string; bestsellers: string; moments: string[] };
  tone: { tones: string[]; sayYes: string; sayNo: string; samples: Record<string, string> };
  goal: { type: Goal["type"] | null; aov: string; margin: string; cpl: string };
  hasAI: boolean;
  demo: boolean;
}

const tuningOf = (j: Json) => {
  const o = (j ?? {}) as { done?: number[]; skipped?: number[] };
  return { done: o.done ?? [], skipped: o.skipped ?? [] };
};

export async function loadTuning(ctx: AppContext, step: number): Promise<TuningVM> {
  const db = await getDb();
  const [bp, docs, media, goals] = await Promise.all([
    db.from("business_profiles").select().eq("organization_id", ctx.org.id).maybeSingle().then(must),
    db.from("documents").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
    db.from("media").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
  ]);
  const goal = goals.find((g) => g.ad_account_id === ctx.account?.id) ?? goals.find((g) => !g.ad_account_id) ?? goals[0] ?? null;
  const f = (bp?.found ?? {}) as { name?: string; sells?: string; sellsSub?: string; colors?: string[]; imageCount?: number; contact?: string };
  const demo = demoSiteOf(bp?.website);
  const brandDoc = docs.filter((d) => d.category === "brandguide").at(-1) ?? null;
  const { done, skipped } = tuningOf(ctx.org.tuning);
  const websiteImages = media.filter((m) => m.source === "website").length;
  return {
    step,
    done,
    skipped,
    orgName: ctx.org.name,
    site: bp?.website ?? "",
    found: f.name
      ? [
          { k: "name", v: f.name },
          { k: "sells", v: f.sells ?? "" },
          { k: "prices", v: f.sellsSub ?? (bp?.offers ?? []).map((o) => `${o.name} ${o.price}`).join(" · ") },
          { k: "colors", v: String((f.colors ?? bp?.colors ?? []).length) },
          { k: "images", v: String(f.imageCount ?? websiteImages) },
          { k: "contact", v: f.contact ?? (bp?.contact as { text?: string } | null)?.text ?? "" },
        ]
      : null,
    brand: {
      file: brandDoc?.name ?? null,
      colors: bp?.colors?.length ? bp.colors : ["", "", "", ""],
      font: bp?.font ?? "",
      logo: !!bp?.logo_path,
      neverSay: bp?.never_say ?? "",
    },
    docs: docs.filter((d) => d.category !== "brandguide").map((d) => ({ id: d.id, name: d.name, category: d.category, status: d.status })),
    images: media.map((m) => ({ id: m.id, name: m.name ?? "", url: mediaUrl(m.id, m.storage_path), kind: m.kind, source: m.source })),
    offer: {
      sells: bp?.sells ?? "",
      audience: bp?.audience ?? "",
      differentiator: bp?.differentiator ?? "",
      bestsellers: bp?.bestsellers ?? "",
      moments: bp?.moments ?? [],
    },
    tone: { tones: bp?.tone ?? [], sayYes: bp?.say_yes ?? demo?.sayYes ?? "", sayNo: bp?.say_no ?? demo?.sayNo ?? "", samples: demo?.toneSamples ?? {} },
    goal: {
      type: goal?.type ?? null,
      aov: goal?.aov ? String(goal.aov).replace(".", ",") : "",
      margin: goal?.margin ? String(Math.round(goal.margin * 100)) : "",
      cpl: goal?.target_cpl ? String(goal.target_cpl).replace(".", ",") : "",
    },
    hasAI: hasAI(ctx.plan),
    demo: isDemo,
  };
}

async function editable() {
  const ctx = await getContext();
  assertCanEdit(ctx);
  return { ctx, db: await getDb() };
}

/** Een stap klaar (of overgeslagen) en naar de volgende. Na stap 8 is het paneel af. */
export async function completeTuningStep(step: number, skip: boolean) {
  const { ctx } = await editable();
  const n = Math.min(TUNING_STEPS, Math.max(1, Math.round(step)));
  if (skip && !OPTIONAL.has(n)) return;
  const t = tuningOf(ctx.org.tuning);
  const done = skip ? t.done.filter((x) => x !== n) : [...new Set([...t.done, n])].sort();
  const skipped = skip ? [...new Set([...t.skipped, n])].sort() : t.skipped.filter((x) => x !== n);
  const next = n >= TUNING_STEPS ? TUNING_STEPS : n + 1;
  await serviceDb()
    .from("organizations")
    .update({ tuning: { done, skipped }, tuning_step: n >= TUNING_STEPS ? TUNING_STEPS + 1 : Math.max(ctx.org.tuning_step, next) })
    .eq("id", ctx.org.id);
}

export async function tuningReadSite(site: string) {
  return readAndSaveWebsite(site);
}

export async function saveBrand(input: { colors: string[]; font: string; neverSay: string }) {
  const { ctx, db } = await editable();
  const colors = input.colors
    .map((c) => c.trim())
    .filter((c) => /^#[0-9a-f]{3,8}$/i.test(c))
    .slice(0, 8);
  await db
    .from("business_profiles")
    .update({ colors, font: input.font.trim().slice(0, 80) || null, never_say: input.neverSay.trim().slice(0, 500) || null, updated_at: nowIso() })
    .eq("organization_id", ctx.org.id);
}

export async function removeDocument(id: string) {
  const { ctx, db } = await editable();
  await db.from("documents").delete().eq("id", id).eq("organization_id", ctx.org.id);
}

/** Demo: drie voorbeeldbestanden (prijslijst, reviews, export uit Ads Manager). */
export async function addSampleDocuments() {
  const { ctx, db } = await editable();
  if (!isDemo) return;
  const samples: [string, "prijs" | "reviews" | "resultaten"][] = [
    ["prijslijst-2026.xlsx", "prijs"],
    ["reviews-google.pdf", "reviews"],
    ["ads-manager-export-november.csv", "resultaten"],
  ];
  for (const [name, category] of samples) {
    const path = await storeFile("documents", ctx.org.id, new File(["Voorbeeldbestand voor de demo."], name, { type: "text/plain" }));
    await db.from("documents").insert({ organization_id: ctx.org.id, category, name, storage_path: path, status: "nieuw" });
  }
}

const MOMENTS = ["feest", "solden", "bf", "val", "moeder", "zomer"];

export async function saveOffer(input: { sells: string; audience: string; differentiator: string; bestsellers: string; moments: string[] }) {
  const { ctx, db } = await editable();
  const cut = (s: string) => s.trim().slice(0, 500) || null;
  await db
    .from("business_profiles")
    .update({
      sells: cut(input.sells),
      audience: cut(input.audience),
      differentiator: cut(input.differentiator),
      bestsellers: cut(input.bestsellers),
      moments: input.moments.filter((m) => MOMENTS.includes(m)),
      updated_at: nowIso(),
    })
    .eq("organization_id", ctx.org.id);
}

export async function saveTone(input: { tones: string[]; sayYes: string; sayNo: string }) {
  const { ctx, db } = await editable();
  await db
    .from("business_profiles")
    .update({
      tone: input.tones.slice(0, 3),
      say_yes: input.sayYes.trim().slice(0, 300) || null,
      say_no: input.sayNo.trim().slice(0, 300) || null,
      updated_at: nowIso(),
    })
    .eq("organization_id", ctx.org.id);
}

export async function saveTuningGoal(input: { type: Goal["type"]; aov: string; margin: string; cpl: string }) {
  const { ctx, db } = await editable();
  if (!["verkopen", "aanvragen", "zaak", "anders"].includes(input.type)) return;
  const n = (s: string) => Number(s.replace(/[€%\s]/g, "").replace(",", ".")) || null;
  const m = n(input.margin);
  const row = {
    type: input.type,
    aov: input.type === "verkopen" ? n(input.aov) : null,
    margin: input.type === "verkopen" && m ? (m > 1 ? m / 100 : m) : null,
    target_cpl: input.type !== "verkopen" && input.type !== "anders" ? n(input.cpl) : null,
    updated_at: nowIso(),
  };
  const goals = must(await db.from("goals").select().eq("organization_id", ctx.org.id));
  const goal = goals.find((g) => g.ad_account_id === ctx.account?.id) ?? goals.find((g) => !g.ad_account_id) ?? null;
  if (goal) await db.from("goals").update(row).eq("id", goal.id);
  else await db.from("goals").insert({ organization_id: ctx.org.id, ...row });
}
