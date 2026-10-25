import "server-only";
import { BASE, VERSION, graphGet, read, withMetaToken } from "./graph";

// "Doorgaan met Facebook" voor de koppeling, met de Meta-app (META_APP_ID, META_APP_SECRET). Met META_LOGIN_CONFIG_ID
// gebruiken we een configuratie van Facebook Login for Business; anders vragen we de rechten zelf.

export const META_SCOPES = [
  "email",
  "public_profile",
  "ads_read",
  "ads_management",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "read_insights",
];

/** Cookie met de controlewaarde en waar je na Meta terugkomt. */
export const META_STATE_COOKIE = "as-meta-state";

export const metaAppId = () => process.env.META_APP_ID ?? "";
export const loginConfigId = () => process.env.META_LOGIN_CONFIG_ID || null;
/** Kan iemand zelf met Facebook koppelen? */
export const oauthReady = () => !!metaAppId() && !!process.env.META_APP_SECRET;

/** Het venster van Meta. */
export function dialogUrl(state: string, redirectUri: string): string {
  const u = new URL(`https://www.facebook.com/${VERSION()}/dialog/oauth`);
  u.searchParams.set("client_id", metaAppId());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  const config = loginConfigId();
  if (config) u.searchParams.set("config_id", config);
  else u.searchParams.set("scope", META_SCOPES.join(","));
  return u.toString();
}

export interface MetaTokenAnswer {
  token: string;
  /** Seconden; leeg als de sleutel niet vervalt. */
  expiresIn: number | null;
}

async function tokenCall(params: Record<string, string>): Promise<MetaTokenAnswer> {
  const u = new URL(`${BASE}/${VERSION()}/oauth/access_token`);
  for (const [k, v] of Object.entries({ client_id: metaAppId(), client_secret: process.env.META_APP_SECRET ?? "", ...params })) u.searchParams.set(k, v);
  const body = await read<{ access_token: string; expires_in?: number }>(await fetch(u, { cache: "no-store" }));
  return { token: body.access_token, expiresIn: body.expires_in ?? null };
}

/** De code uit het venster omwisselen voor een sleutel. */
export const exchangeCode = (code: string, redirectUri: string) => tokenCall({ code, redirect_uri: redirectUri });

/** Een sleutel van een paar uur omwisselen voor een van 60 dagen. */
export const longLived = (token: string) => tokenCall({ grant_type: "fb_exchange_token", fb_exchange_token: token });

/** Wie is dit op Facebook? */
export const fbMe = (token: string) => withMetaToken(token, () => graphGet<{ id: string; name: string }>("me", { fields: "id,name" }));
