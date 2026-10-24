import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createDb, type Db } from "@adsweet/db";
import { pgliteExecutor, supabaseExecutor } from "@adsweet/db/server";
import { env, isDemo } from "@/lib/env";
import { demoDatabase, signDemoToken, verifyDemoToken } from "./demo";
import { supabaseForRequest, supabaseService } from "./supabase";

export const DEMO_SESSION_COOKIE = "as-demo-sessie";
export const DEMO_MAIL_COOKIE = "as-demo-mail";
const LINK_MINUTES = 15;
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
}

/** De ingelogde gebruiker, of null. Eén keer per request. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  if (isDemo) {
    const store = await cookies();
    const t = verifyDemoToken(store.get(DEMO_SESSION_COOKIE)?.value, "sessie");
    if (!t) return null;
    const { data } = await serviceDb().from("profiles").select("user_id, email").eq("user_id", t.uid).maybeSingle();
    return data ? { id: data.user_id, email: data.email } : null;
  }
  const sb = await supabaseForRequest();
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
});

/** Database met de rechten van de ingelogde gebruiker (RLS). */
export const getDb = cache(async (): Promise<Db> => {
  if (isDemo) {
    const user = await currentUser();
    return createDb(pgliteExecutor(demoDatabase(), user?.id ?? "00000000-0000-0000-0000-000000000000"));
  }
  return createDb(supabaseExecutor(await supabaseForRequest()));
});

/** Database zonder RLS. Alleen voor serverlogica die geen gebruiker heeft (inloggen, audit, webhooks). */
export function serviceDb(): Db {
  if (isDemo) return createDb(pgliteExecutor(demoDatabase(), null));
  return createDb(supabaseExecutor(supabaseService()));
}

const safeNext = (next: string | null | undefined) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/vandaag");

/**
 * Stuurt een link om in te loggen. Bestaat het adres niet, dan zeggen we dat niet (geen lek van accounts).
 * In de demomodus gaat er geen mail uit: de link komt op de pagina "Check je mailbox".
 */
export async function sendLoginLink(email: string, next?: string): Promise<{ ok: true } | { ok: false; error: "ongeldig" | "fout" }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, error: "ongeldig" };
  const target = safeNext(next);

  if (isDemo) {
    const store = await cookies();
    const { data } = await serviceDb().from("profiles").select("user_id").eq("email", clean).maybeSingle();
    if (data) {
      const token = signDemoToken({
        uid: data.user_id,
        kind: "link",
        exp: Date.now() + LINK_MINUTES * 60_000,
      });
      const link = `/auth/callback?token=${encodeURIComponent(token)}&next=${encodeURIComponent(target)}`;
      store.set(DEMO_MAIL_COOKIE, link, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: LINK_MINUTES * 60,
      });
    } else {
      store.delete(DEMO_MAIL_COOKIE);
    }
    return { ok: true };
  }

  const sb = await supabaseForRequest();
  const { error } = await sb.auth.signInWithOtp({
    email: clean,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(target)}`,
    },
  });
  // "Signups not allowed" bij een onbekend adres tonen we niet.
  if (error && !/signups? not allowed|not found/i.test(error.message)) return { ok: false, error: "fout" };
  return { ok: true };
}

/** Rondt het inloggen af vanuit de link in de mail. Geeft het pad terug om naartoe te gaan. */
export async function completeLogin(params: URLSearchParams): Promise<{ ok: boolean; next: string }> {
  const next = safeNext(params.get("next"));
  if (isDemo) {
    const t = verifyDemoToken(params.get("token") ?? undefined, "link");
    if (!t) return { ok: false, next };
    const store = await cookies();
    store.set(DEMO_SESSION_COOKIE, signDemoToken({ uid: t.uid, kind: "sessie", exp: Date.now() + SESSION_DAYS * 86_400_000 }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && env.appUrl.startsWith("https"),
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    });
    store.delete(DEMO_MAIL_COOKIE);
    return { ok: true, next };
  }
  const code = params.get("code");
  if (!code) return { ok: false, next };
  const sb = await supabaseForRequest();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  return { ok: !error, next };
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  if (isDemo) {
    store.delete(DEMO_SESSION_COOKIE);
    return;
  }
  const sb = await supabaseForRequest();
  await sb.auth.signOut();
}

/** De demolink die bij het laatste inlogverzoek hoort (alleen demomodus). */
export async function pendingDemoLink(): Promise<string | null> {
  if (!isDemo) return null;
  return (await cookies()).get(DEMO_MAIL_COOKIE)?.value ?? null;
}
