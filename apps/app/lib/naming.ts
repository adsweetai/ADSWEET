import type { Json } from "@adsweet/db";

// Naamgeving en UTM's (Instellingen › Naamgeving en UTM's). Sjablonen met stukken tussen accolades, zoals
// {zaak} · {soort} · {doel} · {maand}. Nieuwe campagnes en ad sets krijgen hun naam hiermee.

export interface Naming {
  short: string;
  campaign: string;
  ad_set: string;
  ad: string;
  utm: string;
}

export const DEFAULT_NAMING: Omit<Naming, "short"> = {
  campaign: "{zaak} · {soort} · {doel} · {maand}",
  ad_set: "AS{n} · {datum} · {reden}",
  ad: "{code} · {fase} · {soort} · {naam}",
  utm: "utm_source=meta, utm_medium=paid_social, utm_campaign={zaak}-{soort}-{doel}, utm_content={code}-{fase}-{soort}",
};

/** De stukken per sjabloon, voor de uitleg onder de velden. */
export const NAMING_TOKENS = {
  campaign: ["zaak", "soort", "doel", "maand"],
  ad_set: ["n", "datum", "reden"],
  ad: ["code", "fase", "soort", "naam"],
  utm: ["zaak", "soort", "doel", "code", "fase"],
} as const;

export function namingOf(json: Json, orgName: string): Naming {
  const o = (json ?? {}) as Partial<Naming> & { utm_source?: string; utm_medium?: string };
  const utm =
    o.utm ??
    DEFAULT_NAMING.utm
      .replace("utm_source=meta", `utm_source=${o.utm_source ?? "meta"}`)
      .replace("utm_medium=paid_social", `utm_medium=${o.utm_medium ?? "paid_social"}`);
  return {
    short: o.short ?? orgName,
    campaign: o.campaign ?? DEFAULT_NAMING.campaign,
    ad_set: o.ad_set ?? DEFAULT_NAMING.ad_set,
    ad: o.ad ?? DEFAULT_NAMING.ad,
    utm,
  };
}

/** Vult de stukken in. Een onbekend stuk blijft staan; {nr} is hetzelfde als {n}. */
export function fillTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k] ?? (k === "nr" ? vars.n : undefined);
    return v === undefined ? m : String(v);
  });
}

/** "utm_source=meta, utm_medium=paid_social, …" → { utm_source: "meta", … } */
export function parseUtm(utm: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of utm.split(/[,&\n]/)) {
    const [k, ...v] = part.split("=");
    if (k?.trim() && v.length) out[k.trim()] = v.join("=").trim();
  }
  return out;
}

export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Vult de UTM's in: utm_content met de stukken van de advertentie, de rest met die van de campagne. In kleine letters. */
export function fillUtm(utm: string, campaign: Record<string, string | number>, ad: Record<string, string | number> = {}): string {
  const lower = (o: Record<string, string | number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, slug(String(v))]));
  const c = lower(campaign);
  const a = lower(ad);
  return Object.entries(parseUtm(utm))
    .map(([k, v]) => `${k}=${fillTemplate(v, k === "utm_content" ? a : c)}`)
    .join(", ");
}

/** De UTM-waarden die op een nieuwe campagne komen. */
export function utmFor(n: Naming, campaign: Record<string, string | number>) {
  const p = parseUtm(fillUtm(n.utm, campaign));
  return { source: p.utm_source ?? "meta", medium: p.utm_medium ?? "paid_social", campaign: p.utm_campaign ?? slug(String(campaign.zaak ?? "")) };
}
