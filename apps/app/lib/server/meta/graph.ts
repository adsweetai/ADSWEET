import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac } from "node:crypto";

// De Graph API van Meta, alleen op de server. Met de sleutel van wie koppelde via "Doorgaan met Facebook"
// (withMetaToken), anders met die van de systeemgebruiker (META_SYSTEM_TOKEN) uit de Meta-app.

export const VERSION = () => process.env.META_API_VERSION || "v24.0";
export const BASE = "https://graph.facebook.com";

const current = new AsyncLocalStorage<string>();

/** Voert fn uit met deze sleutel. Zonder sleutel geldt die van de systeemgebruiker. */
export function withMetaToken<T>(token: string | null | undefined, fn: () => Promise<T>): Promise<T> {
  return token ? current.run(token, fn) : fn();
}

export const systemToken = () => process.env.META_SYSTEM_TOKEN ?? "";
/** Is er een sleutel van een systeemgebruiker ingesteld? */
export const metaConfigured = () => systemToken().length > 20;
export const metaToken = () => current.getStore() ?? systemToken();

export class MetaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message);
  }
  /** De sleutel werkt niet meer (verlopen of ingetrokken). */
  get expired() {
    return this.code === 190;
  }
}

/** Met META_APP_SECRET sturen we appsecret_proof mee, zoals Meta aanraadt. */
function authParams(): Record<string, string> {
  const token = metaToken();
  const secret = process.env.META_APP_SECRET;
  return secret ? { access_token: token, appsecret_proof: createHmac("sha256", secret).update(token).digest("hex") } : { access_token: token };
}

type Params = Record<string, string | number | boolean | object | undefined>;

function url(path: string, params: Params): string {
  const u = new URL(`${BASE}/${VERSION()}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries({ ...params, ...authParams() })) {
    if (v === undefined) continue;
    u.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return u.toString();
}

export async function read<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_subcode?: number } };
  if (!res.ok || body.error) {
    const e = body.error ?? {};
    throw new MetaError(e.message ?? `Meta antwoordde ${res.status}`, res.status, e.code, e.error_subcode);
  }
  return body as T;
}

export async function graphGet<T>(path: string, params: Params = {}): Promise<T> {
  if (metaToken().length < 20) throw new MetaError("Geen Meta-sleutel: koppel met Facebook of stel META_SYSTEM_TOKEN in.", 401);
  return read<T>(await fetch(url(path, params), { cache: "no-store" }));
}

/** Alle pagina's van een lijst (data + paging.next), met een bovengrens tegen eindeloze lijsten. */
export async function graphAll<T>(path: string, params: Params = {}, maxPages = 25): Promise<T[]> {
  const out: T[] = [];
  let page = await graphGet<{ data: T[]; paging?: { next?: string } }>(path, params);
  out.push(...page.data);
  for (let i = 1; i < maxPages && page.paging?.next; i++) {
    page = await read<{ data: T[]; paging?: { next?: string } }>(await fetch(page.paging.next, { cache: "no-store" }));
    out.push(...page.data);
  }
  return out;
}
