import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createDemoDatabase, type DemoDb } from "@adsweet/db/server";

const g = globalThis as unknown as { __adsweetDemoDb?: Promise<DemoDb>; __adsweetDemoSecret?: string };

/** Eén demodatabase per serverproces. Begint telkens opnieuw vanaf de voorbeelddata. */
export function demoDatabase(): Promise<DemoDb> {
  g.__adsweetDemoDb ??= createDemoDatabase();
  return g.__adsweetDemoDb;
}

/** Zet de demodatabase terug naar de voorbeelddata (demopaneel en tests). */
export async function resetDemoDatabase(): Promise<void> {
  const old = g.__adsweetDemoDb;
  g.__adsweetDemoDb = createDemoDatabase();
  await g.__adsweetDemoDb;
  if (old) (await old).close().catch(() => {});
}

function secret(): string {
  g.__adsweetDemoSecret ??= process.env.DEMO_AUTH_SECRET || randomBytes(32).toString("hex");
  return g.__adsweetDemoSecret;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export interface DemoToken {
  uid: string;
  kind: "link" | "sessie";
  exp: number;
}

/** Ondertekent een token. Alleen voor de demomodus; met Supabase beheert Supabase Auth de sessie. */
export function signDemoToken(t: DemoToken): string {
  const body = b64(JSON.stringify(t));
  return `${body}.${sign(body)}`;
}

export function verifyDemoToken(token: string | undefined, kind: DemoToken["kind"]): DemoToken | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const t = JSON.parse(Buffer.from(body, "base64url").toString()) as DemoToken;
    if (t.kind !== kind || t.exp < Date.now()) return null;
    return t;
  } catch {
    return null;
  }
}
