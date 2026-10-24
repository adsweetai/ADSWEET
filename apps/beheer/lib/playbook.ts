import { PLAYBOOK } from "@adsweet/playbook";

// Het playbook als gegevens (Beheer.dc.html#playbook): elke waarde is bewerkbaar zonder code. Hier staan de
// velden, het omzetten tussen regels en formulier, de controle, het volgende versienummer en het vergelijken.

export interface Rules {
  minDailyBudget: { default: number; webshop: number };
  loserMultiple: number;
  startStructure: { campaigns: number; adSets: number; ads: number; photos: number; videos: number };
  scaleStep: number;
  newAdSetEveryWeeks: number;
  funnelSplit: { top: number; middle: number; bottom: number };
  statusWarnRatio: number;
}

export type Unit = "count" | "euro" | "percent" | "times" | "weeks";
export type Group = "start" | "budget" | "scale";

export interface Field {
  key: string;
  group: Group;
  unit: Unit;
  min: number;
  max: number;
}

export const FIELDS: Field[] = [
  { key: "startStructure.campaigns", group: "start", unit: "count", min: 1, max: 5 },
  { key: "startStructure.adSets", group: "start", unit: "count", min: 1, max: 10 },
  { key: "startStructure.ads", group: "start", unit: "count", min: 1, max: 20 },
  { key: "startStructure.photos", group: "start", unit: "count", min: 0, max: 20 },
  { key: "startStructure.videos", group: "start", unit: "count", min: 0, max: 20 },
  { key: "minDailyBudget.default", group: "budget", unit: "euro", min: 1, max: 1000 },
  { key: "minDailyBudget.webshop", group: "budget", unit: "euro", min: 1, max: 1000 },
  { key: "loserMultiple", group: "scale", unit: "times", min: 1, max: 10 },
  { key: "scaleStep", group: "scale", unit: "percent", min: 1, max: 100 },
  { key: "newAdSetEveryWeeks", group: "scale", unit: "weeks", min: 1, max: 12 },
  { key: "funnelSplit.top", group: "scale", unit: "count", min: 0, max: 20 },
  { key: "funnelSplit.middle", group: "scale", unit: "count", min: 0, max: 20 },
  { key: "funnelSplit.bottom", group: "scale", unit: "count", min: 0, max: 20 },
  { key: "statusWarnRatio", group: "scale", unit: "percent", min: 1, max: 100 },
];

export const BASE_RULES: Rules = JSON.parse(JSON.stringify(PLAYBOOK));

/** De regels van een versie, aangevuld met de standaard voor wat ontbreekt. */
export function rulesOf(json: unknown): Rules {
  const r = (json ?? {}) as Partial<Rules>;
  return {
    minDailyBudget: { ...BASE_RULES.minDailyBudget, ...r.minDailyBudget },
    loserMultiple: r.loserMultiple ?? BASE_RULES.loserMultiple,
    startStructure: { ...BASE_RULES.startStructure, ...r.startStructure },
    scaleStep: r.scaleStep ?? BASE_RULES.scaleStep,
    newAdSetEveryWeeks: r.newAdSetEveryWeeks ?? BASE_RULES.newAdSetEveryWeeks,
    funnelSplit: { ...BASE_RULES.funnelSplit, ...r.funnelSplit },
    statusWarnRatio: r.statusWarnRatio ?? BASE_RULES.statusWarnRatio,
  };
}

export function getValue(rules: Rules, key: string): number {
  return key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], rules) as number;
}

function setValue(rules: Rules, key: string, v: number): void {
  const parts = key.split(".");
  let o = rules as unknown as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) o = o[p] as Record<string, unknown>;
  o[parts.at(-1)!] = v;
}

const pct = (u: Unit) => u === "percent";

/** Zoals in het formulier: percentages als 20 in plaats van 0,2; komma als decimaalteken. */
export function toForm(rules: Rules): Record<string, string> {
  return Object.fromEntries(
    FIELDS.map((f) => {
      const v = getValue(rules, f.key);
      const shown = pct(f.unit) ? Math.round(v * 1000) / 10 : v;
      return [f.key, String(shown).replace(".", ",")];
    }),
  );
}

export type FormError =
  { key: string; kind: "range" } | { key: "startStructure.ads"; kind: "mix" | "funnel" } | { key: "minDailyBudget.webshop"; kind: "webshop" };

/** Van formulier naar regels, met de controles. */
export function fromForm(form: Record<string, string>): { ok: true; rules: Rules } | { ok: false; errors: FormError[] } {
  const rules = rulesOf(BASE_RULES);
  const errors: FormError[] = [];
  for (const f of FIELDS) {
    const raw = String(form[f.key] ?? "")
      .trim()
      .replace(/[€%×x\s]/gi, "")
      .replace(",", ".");
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n < f.min || n > f.max || (f.unit !== "euro" && f.unit !== "percent" && !Number.isInteger(n))) {
      errors.push({ key: f.key, kind: "range" });
      continue;
    }
    setValue(rules, f.key, pct(f.unit) ? Math.round(n * 10) / 1000 : n);
  }
  if (!errors.length) {
    const s = rules.startStructure;
    if (s.photos + s.videos !== s.ads) errors.push({ key: "startStructure.ads", kind: "mix" });
    const fs = rules.funnelSplit;
    if (fs.top + fs.middle + fs.bottom !== s.ads) errors.push({ key: "startStructure.ads", kind: "funnel" });
    if (rules.minDailyBudget.webshop < rules.minDailyBudget.default) errors.push({ key: "minDailyBudget.webshop", kind: "webshop" });
  }
  return errors.length ? { ok: false, errors } : { ok: true, rules };
}

const parse = (v: string) => v.split(".").map((x) => Number(x) || 0);

/** 1.0, 1.2, 1.10 → 1.11: de hoogste versie plus één. */
export function nextVersion(versions: string[]): string {
  const [major, minor] = versions.map(parse).sort((a, b) => b[0] - a[0] || b[1] - a[1])[0] ?? [1, -1];
  return `${major}.${minor + 1}`;
}

export const versionOrder = (a: string, b: string) => {
  const [x, y] = [parse(a), parse(b)];
  return y[0] - x[0] || y[1] - x[1];
};

/** Wat er verschilt tussen twee versies: gewijzigde waarden per veld. */
export function diffRules(a: Rules, b: Rules): { key: string; from: number; to: number }[] {
  return FIELDS.filter((f) => getValue(a, f.key) !== getValue(b, f.key)).map((f) => ({ key: f.key, from: getValue(a, f.key), to: getValue(b, f.key) }));
}
