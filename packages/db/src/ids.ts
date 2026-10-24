import { createHash } from "node:crypto";

/** Vaste UUID voor een naam, zodat de voorbeelddata bij elke seed dezelfde sleutels krijgt. */
export function seedId(name: string): string {
  const h = createHash("sha1").update(`adsweet:${name}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}
