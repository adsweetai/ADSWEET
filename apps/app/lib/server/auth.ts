import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createDb, type Db } from "@adsweet/db";
import { pgliteExecutor, supabaseExecutor } from "@adsweet/db/server";
import { env, isDemo } from "@/lib/env";
import { demoDatabase, signDemoToken, verifyDemoToken } from "./demo";
import { sendMail } from "./mail";
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
 * Stuurt een link om in te loggen. Een nieuw adres krijgt meteen een account.
 * In de demomodus gaat er geen mail uit: de link komt op de pagina "Check je mailbox" (alleen voor de voorbeeldaccounts).
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

  return (await mailLoginLink(clean, target)) ? { ok: true } : { ok: false, error: "fout" };
}

const g = globalThis as unknown as { __adsweetLinkSent?: Map<string, number> };

/**
 * Supabase: maakt het account aan als het adres nieuw is (wie zijn adres opgeeft, mag binnen) en stuurt de link. De
 * link maken we zelf en hij gaat via Resend, zonder de limieten van de mailer van Supabase. Zonder RESEND_API_KEY
 * versturen we via Supabase. Hoogstens één link per minuut per adres.
 */
async function mailLoginLink(email: string, next: string): Promise<boolean> {
  const sent = (g.__adsweetLinkSent ??= new Map());
  const last = sent.get(email);
  if (last && Date.now() - last < 60_000) return true;

  const admin = supabaseService().auth.admin;
  const created = await admin.createUser({ email, email_confirm: true });
  if (created.error && created.error.code !== "email_exists") {
    console.warn(`Account niet aangemaakt: ${created.error.status ?? ""} ${created.error.code ?? ""} ${created.error.message}`.trim());
    return false;
  }
  if (process.env.RESEND_API_KEY) {
    const { data, error } = await admin.generateLink({ type: "magiclink", email });
    if (error) console.warn(`Inloglink niet gemaakt: ${error.status ?? ""} ${error.code ?? ""} ${error.message}`.trim());
    else {
      const url = `${env.appUrl}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&next=${encodeURIComponent(next)}`;
      // Na een gemaakte link stuurt Supabase een minuut lang zelf geen link: weigert Resend, dan is dat een fout.
      if (!(await sendMail("login", email, { url }))) return false;
      sent.set(email, Date.now());
      return true;
    }
  }
  const sb = await supabaseForRequest();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    console.warn(`Inloglink niet verstuurd: ${error.status ?? ""} ${error.code ?? ""} ${error.message}`.trim());
    return false;
  }
  sent.set(email, Date.now());
  return true;
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
  const sb = await supabaseForRequest();
  // Onze eigen link (via Resend) draagt token_hash; die van de mailer van Supabase een code.
  const tokenHash = params.get("token_hash");
  if (tokenHash) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    return { ok: !error, next };
  }
  const code = params.get("code");
  if (!code) return { ok: false, next };
  const { error } = await sb.auth.exchangeCodeForSession(code);
  return { ok: !error, next };
}

/** Demo: start een sessie voor een gebruiker (na "Doorgaan met Facebook" in de demo of een uitnodiging). */
export async function startDemoSession(uid: string) {
  if (!isDemo) throw new Error("Alleen in de demomodus.");
  (await cookies()).set(DEMO_SESSION_COOKIE, signDemoToken({ uid, kind: "sessie", exp: Date.now() + SESSION_DAYS * 86_400_000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && env.appUrl.startsWith("https"),
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

/**
 * Demo: maakt een gebruiker aan zoals Supabase Auth dat doet na Facebook of een uitnodiging. De trigger
 * handle_new_user maakt het profiel. Geeft de id terug (of de bestaande, als het adres al bestaat).
 */
export async function createDemoUser(email: string, firstName: string, provider: "facebook" | "email"): Promise<string> {
  if (!isDemo) throw new Error("Alleen in de demomodus.");
  const db = await demoDatabase();
  const found = await db.query<{ id: string }>("select id from auth.users where lower(email) = lower($1)", [email]);
  if (found.rows[0]) return found.rows[0].id;
  const meta = JSON.stringify({ first_name: firstName, full_name: firstName });
  const app = JSON.stringify({ provider, providers: [provider] });
  const res = await db.query<{ id: string }>(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, '', now(), $2::jsonb, $3::jsonb, now(), now()) returning id`,
    [email.toLowerCase(), app, meta],
  );
  return res.rows[0].id;
}

/** Supabase: de url om met Facebook in te loggen (Supabase Auth, provider facebook). */
export async function facebookSignInUrl(next: string): Promise<string | null> {
  if (isDemo) return null;
  const sb = await supabaseForRequest();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(safeNext(next))}`, scopes: "email,public_profile" },
  });
  return error ? null : data.url;
}

/** Een uitgenodigd teamlid krijgt een link per mail. Bestaat het account nog niet, dan maken we het aan. */
export async function sendInviteLink(email: string, next: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (isDemo) {
    const first = clean.split("@")[0].split(/[._-]/)[0];
    await createDemoUser(clean, first.slice(0, 1).toUpperCase() + first.slice(1), "email");
    return (await sendLoginLink(clean, next)).ok;
  }
  return mailLoginLink(clean, safeNext(next));
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
