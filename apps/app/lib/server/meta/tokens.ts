import "server-only";
import { isDemo } from "@/lib/env";
import { supabaseService } from "../supabase";
import { fbMe, longLived, oauthReady } from "./oauth";

// De Meta-sleutel van een gebruiker, na "Doorgaan met Facebook". Versleuteld in Supabase Vault
// (migratie 20261205000000_meta_tokens.sql); alleen de server leest en bewaart hem.

/** Bewaart de sleutel, eerst omgewisseld voor een van 60 dagen als de Meta-app ingesteld is. */
export async function saveUserMetaToken(userId: string, token: string, expiresIn: number | null = null): Promise<{ name: string | null }> {
  let answer = { token, expiresIn };
  if (oauthReady()) {
    try {
      answer = await longLived(token);
    } catch (e) {
      console.warn(`Meta-sleutel niet verlengd: ${(e as Error).message}`);
    }
  }
  const me = await fbMe(answer.token).catch(() => null);
  const expires = answer.expiresIn ? new Date(Date.now() + answer.expiresIn * 1000).toISOString() : null;
  const { error } = await supabaseService().rpc("save_meta_token", {
    p_user: userId,
    p_token: answer.token,
    p_expires: expires,
    p_fb_user: me?.id ?? null,
    p_fb_name: me?.name ?? null,
  });
  if (error) throw new Error(`Meta-sleutel niet bewaard: ${error.message}`);
  return { name: me?.name ?? null };
}

/** De sleutel van deze gebruiker, of null. */
export async function userMetaToken(userId: string | null | undefined): Promise<string | null> {
  if (isDemo || !userId) return null;
  const { data, error } = await supabaseService().rpc("meta_token", { p_user: userId });
  if (error) {
    console.warn(`Meta-sleutel niet gelezen: ${error.message}`);
    return null;
  }
  return typeof data === "string" && data ? data : null;
}
