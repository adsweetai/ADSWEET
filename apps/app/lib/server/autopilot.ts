import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type Json } from "@adsweet/db";
import { formatEuro } from "@adsweet/ui";
import { getDb } from "./auth";
import { writeLog } from "./changes";
import { assertCanEdit, getContext, type AppContext } from "./context";

// Autopilot en regels (App.dc.html#autopilot). AdSweet zet nooit zelf een advertentie af, ook de autopilot niet:
// die schakelaar bestaat niet, en een regel kan het hoogstens voorstellen.

export type Mode = "uit" | "vraag" | "grenzen";
export type Limit = "budgetUp" | "budgetDown" | "extras";
export const LIMIT_DEFAULTS: Record<Limit, boolean> = { budgetUp: true, budgetDown: false, extras: true };

export const METRICS = ["kost_per_verkoop", "kost_per_aanvraag", "roas", "uitgaven_per_dag", "ctr"] as const;
export const COMPARATORS = ["hoger", "lager"] as const;
export const WINDOWS = ["2_dagen", "1_dag", "3_dagen"] as const;
export const ACTIONS = ["melding", "budget", "starten", "voorstel_afzetten"] as const;
export const TEMPLATES = ["kosten", "vermoeidheid", "budget", "moment"] as const;

export interface RuleVM {
  id: string;
  text: string;
}

export interface AutopilotVM {
  mode: Mode;
  limits: Record<Limit, boolean>;
  rules: RuleVM[];
}

type Tr = Awaited<ReturnType<typeof getTranslations>>;

function ruleText(r: { metric: string; comparator: string; value: number | null; window: string; action: string; action_value: string | null }, t: Tr) {
  if (r.metric.startsWith("sjabloon:")) return t(`templates.${r.metric.slice(9)}.rule`);
  const money = r.metric === "kost_per_verkoop" || r.metric === "kost_per_aanvraag" || r.metric === "uitgaven_per_dag";
  const value =
    r.value === null
      ? "[waarde]"
      : money
        ? formatEuro(Number(r.value))
        : r.metric === "ctr"
          ? `${String(r.value).replace(".", ",")}%`
          : String(r.value).replace(".", ",");
  return t("ruleText", {
    metric: t(`metrics.${r.metric}`),
    comparator: t(`comparators.${r.comparator}`),
    value,
    window: t(`windows.${r.window}`),
    action: t(`actions.${r.action}`),
  });
}

export async function loadAutopilot(ctx: AppContext): Promise<AutopilotVM> {
  const t = await getTranslations("autopilot");
  const db = await getDb();
  const [settings, rules] = await Promise.all([
    db.from("autopilot_settings").select().eq("organization_id", ctx.org.id).maybeSingle().then(must),
    db.from("rules").select().eq("organization_id", ctx.org.id).eq("active", true).order("created_at").then(must),
  ]);
  const limits = { ...LIMIT_DEFAULTS, ...((settings?.limits ?? {}) as Partial<Record<Limit, boolean>>) };
  return { mode: settings?.mode ?? "vraag", limits, rules: rules.map((r) => ({ id: r.id, text: ruleText(r, t) })) };
}

async function editable() {
  const ctx = await getContext();
  assertCanEdit(ctx);
  return { ctx, db: await getDb() };
}

async function upsertSettings(ctx: AppContext, patch: { mode?: Mode; limits?: Record<Limit, boolean> }) {
  const db = await getDb();
  const cur = must(await db.from("autopilot_settings").select().eq("organization_id", ctx.org.id).maybeSingle());
  if (cur)
    await db
      .from("autopilot_settings")
      .update({ ...patch, limits: (patch.limits ?? cur.limits) as Json })
      .eq("organization_id", ctx.org.id);
  else
    await db.from("autopilot_settings").insert({ organization_id: ctx.org.id, mode: patch.mode ?? "vraag", limits: (patch.limits ?? LIMIT_DEFAULTS) as Json });
}

export async function setMode(mode: Mode) {
  const { ctx, db } = await editable();
  if (!["uit", "vraag", "grenzen"].includes(mode)) return;
  const t = await getTranslations("autopilot");
  const before = (await loadAutopilot(ctx)).mode;
  if (before === mode) return;
  await upsertSettings(ctx, { mode });
  await writeLog(db, ctx, { kind: "wijziging", what: t("logMode"), from_to: `${t(`modes.${before}.t`)} → ${t(`modes.${mode}.t`)}` });
}

export async function setLimit(key: Limit, on: boolean) {
  const { ctx } = await editable();
  if (!(key in LIMIT_DEFAULTS)) return;
  const cur = await loadAutopilot(ctx);
  await upsertSettings(ctx, { limits: { ...cur.limits, [key]: on } });
}

export async function addRule(input: { metric: string; comparator: string; value: string; window: string; action: string }) {
  const { ctx, db } = await editable();
  if (
    !METRICS.includes(input.metric as (typeof METRICS)[number]) ||
    !COMPARATORS.includes(input.comparator as (typeof COMPARATORS)[number]) ||
    !WINDOWS.includes(input.window as (typeof WINDOWS)[number]) ||
    !ACTIONS.includes(input.action as (typeof ACTIONS)[number])
  )
    return { ok: false };
  const value = Number(input.value.replace(/[€%\s]/g, "").replace(",", "."));
  await db.from("rules").insert({
    organization_id: ctx.org.id,
    metric: input.metric,
    comparator: input.comparator,
    value: Number.isFinite(value) ? value : null,
    window: input.window,
    action: input.action as (typeof ACTIONS)[number],
  });
  return { ok: true };
}

export async function addTemplate(key: (typeof TEMPLATES)[number]) {
  const { ctx, db } = await editable();
  if (!TEMPLATES.includes(key)) return;
  await db.from("rules").insert({
    organization_id: ctx.org.id,
    metric: `sjabloon:${key}`,
    comparator: "",
    value: null,
    window: "",
    action: key === "moment" ? "starten" : "melding",
  });
}

export async function removeRule(id: string) {
  const { ctx, db } = await editable();
  await db.from("rules").delete().eq("id", id).eq("organization_id", ctx.org.id);
}
