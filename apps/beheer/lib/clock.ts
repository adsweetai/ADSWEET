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

/** Tijdstip voor nieuwe rijen. In de demomodus de demodatum met de huidige tijd in Brussel. */
export function nowIso(): string {
  if (!process.env.APP_TODAY && !isDemo) return new Date().toISOString();
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(
    new Date(),
  );
  // De voorbeelddata van vandaag loopt tot 06:00 (de dagelijkse audit). Wat je 's nachts in de demo doet, schuift
  // 8 uur op, zodat het altijd na de audit komt en bovenaan in het logboek staat.
  const [h, rest] = [Number(time.slice(0, 2)), time.slice(2)];
  return new Date(`${today()}T${String(h < 8 ? h + 8 : h).padStart(2, "0")}${rest}+01:00`).toISOString();
}
