// De lichte kleuren uit packages/ui/src/tokens.source.css. Mailclients kennen geen CSS-variabelen, dus hier als
// waarden. De test (tokens.test.ts) houdt ze gelijk met het designsysteem. Mails zijn altijd licht.

export const MAIL_TOKENS = {
  ground: "#EAE8E3",
  surface: "#F5F4F0",
  surfaceSunken: "#E2E0DA",
  ink: "#151514",
  inkMuted: "#5F5C56",
  inkAccent: "#7A776F",
  lineStrong: "#7A776F",
  robijn: "#C7254E",
  act: "#AE3A1F",
  /** --line (#15151424) op --ground, als vaste kleur: niet elke mailclient kent hex met alfa. */
  line: "#CCCAC6",
  font: '"Host Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

/** Mengt een kleur met alfa (#rrggbbaa) over een achtergrond (#rrggbb). */
export function blend(rgba: string, over: string): string {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const a = c(rgba, 3) / 255;
  const mix = [0, 1, 2].map((i) => Math.round(c(rgba, i) * a + c(over, i) * (1 - a)));
  return `#${mix.map((x) => x.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
