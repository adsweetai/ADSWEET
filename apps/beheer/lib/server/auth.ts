import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createDb, must, type Db } from "@adsweet/db";
import { pgliteExecutor, supabaseExecutor } from "@adsweet/db/server";
import { env, isDemo } from "@/lib/env";
import { demoDatabase, signDemoToken, verifyDemoToken } from "./demo";
import { supabaseForRequest, supabaseService } from "./supabase";

// Inloggen in Beheer: dezelfde link per mail als in de app. In de demomodus een eigen cookie, zodat Beheer en de
// app op localhost elkaars sessie niet overschrijven.

export const SESSION_COOKIE = "as-beheer-sessie";
export const MAIL_COOKIE = "as-beheer-mail";
const LINK_MINUTES = 15;
const SESSION_HOURS = 12;

export interface SessionUser {
  id: string;
  email: string;
}

export const currentUser = cache(async (): Promise<SessionUser | null> => {
  if (isDemo) {
    const t = verifyDemoToken((await cookies()).get(SESSION_COOKIE)?.value, "sessie");
    if (!t) return null;
    const p = must(await serviceDb().from("profiles").select("user_id, email").eq("user_id", t.uid).maybeSingle());
    return p ? { id: p.user_id, email: p.email } : null;
  }
  const { data } = await (await supabaseForRequest()).auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
});

/** Database met de rechten van de ingelogde gebruiker (RLS: is_adsweet_admin). */
export const getDb = cache(async (): Promise<Db> => {
  if (isDemo) return createDb(pgliteExecutor(demoDatabase(), (await currentUser())?.id ?? "00000000-0000-0000-0000-000000000000"));
  return createDb(supabaseExecutor(await supabaseForRequest()));
});

/** Zonder RLS. Alleen na requireAdmin(). */
export function serviceDb(): Db {
  if (isDemo) return createDb(pgliteExecutor(demoDatabase(), null));
  return createDb(supabaseExecutor(supabaseService()));
}

/** Is deze gebruiker AdSweet-beheerder? De rij in adsweet_admins is alleen voor jezelf leesbaar. */
export async function isAdmin(user: SessionUser): Promise<boolean> {
  const db = await getDb();
  return !!must(await db.from("adsweet_admins").select("user_id").eq("user_id", user.id).maybeSingle());
}

/** Voor elke pagina en elke actie in Beheer: ingelogd en adsweet_admin, anders weg. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/inloggen");
  if (!(await isAdmin(user))) redirect("/geen-toegang");
  return user;
}

const safeNext = (next: string | null | undefined) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/playbook");

/** Stuurt een link om in te loggen. Een onbekend adres verraden we niet. In de demo komt de link op de pagina. */
export async function sendLoginLink(email: string): Promise<{ ok: boolean }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false };
  if (isDemo) {
    const store = await cookies();
    const p = must(await serviceDb().from("profiles").select("user_id").eq("email", clean).maybeSingle());
    if (p) {
      const token = signDemoToken({ uid: p.user_id, kind: "link", exp: Date.now() + LINK_MINUTES * 60_000 });
      store.set(MAIL_COOKIE, `/auth/callback?token=${encodeURIComponent(token)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: LINK_MINUTES * 60 });
    } else store.delete(MAIL_COOKIE);
    return { ok: true };
  }
  const { error } = await (
    await supabaseForRequest()
  ).auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: false, emailRedirectTo: `${env.beheerUrl}/auth/callback` },
  });
  return { ok: !error || /signups? not allowed|not found/i.test(error.message) };
}

export async function completeLogin(params: URLSearchParams): Promise<{ ok: boolean; next: string }> {
  const next = safeNext(params.get("next"));
  if (isDemo) {
    const t = verifyDemoToken(params.get("token") ?? undefined, "link");
    if (!t) return { ok: false, next };
    const store = await cookies();
    store.set(SESSION_COOKIE, signDemoToken({ uid: t.uid, kind: "sessie", exp: Date.now() + SESSION_HOURS * 3_600_000 }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && env.beheerUrl.startsWith("https"),
      path: "/",
      maxAge: SESSION_HOURS * 3600,
    });
    store.delete(MAIL_COOKIE);
    return { ok: true, next };
  }
  const code = params.get("code");
  if (!code) return { ok: false, next };
  const { error } = await (await supabaseForRequest()).auth.exchangeCodeForSession(code);
  return { ok: !error, next };
}

export async function logout() {
  if (isDemo) {
    (await cookies()).delete(SESSION_COOKIE);
    return;
  }
  await (await supabaseForRequest()).auth.signOut();
}
