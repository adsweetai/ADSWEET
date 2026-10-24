// Getallen, bedragen en datums in Belgisch Nederlands: €1.234,56 · €195 · 40% · 2,5 · maandag 7 december · 06:00.

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("nl-BE", { minimumFractionDigits: min, maximumFractionDigits: max });

/** Getal met punten voor duizendtallen en een komma voor decimalen. */
export function formatNumber(n: number, decimals = 0): string {
  return nf(decimals, decimals).format(n);
}

/**
 * Bedrag zonder spatie na het euroteken. Standaard zonder centen als het een rond bedrag is (€195), anders met (€23,20).
 * Geef `decimals` mee om het vast te zetten.
 */
export function formatEuro(n: number, decimals?: number): string {
  const d = decimals ?? (Math.round(n * 100) % 100 === 0 ? 0 : 2);
  const s = nf(d, d).format(Math.abs(n));
  return `${n < 0 ? "−" : ""}€${s}`;
}

/** Percentage van een fractie: 0.4 → "40%", 0.014 → "1,4%". */
export function formatPercent(fraction: number, decimals?: number): string {
  const v = fraction * 100;
  const d = decimals ?? (Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1);
  return `${nf(d, d).format(v)}%`;
}

/** ROAS met komma en twee decimalen, behalve een rond getal met één decimaal: 2,28 · 3,07 · 2,5. */
export function formatRoas(roas: number, decimals?: number): string {
  if (decimals !== undefined) return nf(decimals, decimals).format(roas);
  const r2 = Math.round(roas * 100) / 100;
  return nf(r2 * 10 === Math.round(r2 * 10) ? 1 : 2, 2).format(r2);
}

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];
const DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "7 december" */
export function formatDayMonth(iso: string): string {
  const p = parts(iso);
  return `${p.d} ${MONTHS[p.m - 1]}`;
}

/** "maandag 7 december" */
export function formatLongDate(iso: string, withYear = false): string {
  const p = parts(iso);
  return `${DAYS[p.dow]} ${p.d} ${MONTHS[p.m - 1]}${withYear ? ` ${p.y}` : ""}`;
}

/** "7 december 2026" */
export function formatDate(iso: string): string {
  const p = parts(iso);
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** "06:00" in Brussel. */
export function formatTime(isoDateTime: string, timeZone = "Europe/Brussels"): string {
  return new Intl.DateTimeFormat("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(isoDateTime));
}

/** Datum in Brussel (YYYY-MM-DD) voor een tijdstip. */
export function brusselsDate(isoDateTime: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date(isoDateTime));
}

/** "7 december 06:00" */
export function formatDateTime(isoDateTime: string): string {
  return `${formatDayMonth(brusselsDate(isoDateTime))} ${formatTime(isoDateTime)}`;
}

/** "17-11-2026" zoals in de namen van ad sets. */
export function formatDashDate(iso: string): string {
  const p = parts(iso);
  return `${String(p.d).padStart(2, "0")}-${String(p.m).padStart(2, "0")}-${p.y}`;
}

/** "nov26" zoals in de namen van campagnes. */
export function formatMonthCode(iso: string): string {
  const p = parts(iso);
  return `${MONTHS[p.m - 1].slice(0, 3)}${String(p.y).slice(2)}`;
}
