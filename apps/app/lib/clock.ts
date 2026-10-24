import { isDemo } from "./env";

/** De demodatum uit de brief: maandag 7 december 2026. */
export const DEMO_TODAY = "2026-12-07";

/**
 * "Vandaag" voor de app. In de demomodus de demodatum, zodat de voorbeelddata klopt. Met APP_TODAY kan je
 * een andere datum vastzetten (tests). Anders de datum in Brussel.
 */
export function today(): string {
  const fixed = process.env.APP_TODAY;
  if (fixed) return fixed;
  if (isDemo) return DEMO_TODAY;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Aantal dagen van a tot b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}
