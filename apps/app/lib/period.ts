import { addDays } from "./clock";

export type Period = "gisteren" | "7d" | "30d" | "start" | "zelf";
export const PERIODS: Period[] = ["gisteren", "7d", "30d", "start", "zelf"];
export const PERIOD_COOKIE = "as-periode";

/** Datumbereik (inclusief) voor een periode. "Laatste 7 dagen" op 7 december is 30 november tot en met 6 december. */
export function periodRange(p: Period, today: string, start?: string | null): { from: string; to: string } {
  const to = addDays(today, -1);
  switch (p) {
    case "gisteren":
      return { from: to, to };
    case "30d":
      return { from: addDays(today, -30), to };
    case "start":
      return { from: start ?? addDays(today, -365), to };
    default:
      return { from: addDays(today, -7), to };
  }
}
