import "server-only";
import { cookies } from "next/headers";
import { must, type Role } from "@adsweet/db";
import { nowIso } from "@/lib/clock";
import { currentUser, serviceDb } from "./auth";
import { ORG_COOKIE } from "./context";

// Uitnodigingen van teamleden (Inloggen.dc.html#uitnodiging). Het token in de link is de sleutel; we lezen en
// aanvaarden op de server met de service role, na controle van het token en de sessie.

export interface InvitationVM {
  token: string;
  valid: boolean;
  orgName: string;
  inviter: string;
  role: Role;
  email: string;
}

const TOKEN = /^[a-z0-9-]{8,80}$/i;

export async function loadInvitation(token: string): Promise<InvitationVM | null> {
  if (!TOKEN.test(token)) return null;
  const db = serviceDb();
  const inv = must(await db.from("invitations").select().eq("token", token).maybeSingle());
  if (!inv) return null;
  const [org, inviter] = await Promise.all([
    db.from("organizations").select("name").eq("id", inv.organization_id).single().then(must),
    inv.invited_by ? db.from("profiles").select("first_name").eq("user_id", inv.invited_by).maybeSingle().then(must) : Promise.resolve(null),
  ]);
  return {
    token,
    valid: !inv.accepted_at && inv.expires_at > nowIso(),
    orgName: org.name,
    inviter: inviter?.first_name ?? org.name,
    role: inv.role,
    email: inv.email,
  };
}

/** Maakt de ingelogde gebruiker lid van de organisatie, met de rol en de accounts uit de uitnodiging. */
export async function acceptInvitation(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) return false;
  const user = await currentUser();
  if (!user) return false;
  const db = serviceDb();
  const inv = must(await db.from("invitations").select().eq("token", token).maybeSingle());
  if (!inv || inv.accepted_at || inv.expires_at <= nowIso()) return false;
  const member = must(await db.from("members").select("id").eq("user_id", user.id).eq("organization_id", inv.organization_id).maybeSingle());
  if (!member) await db.from("members").insert({ user_id: user.id, organization_id: inv.organization_id, role: inv.role, ad_account_ids: inv.ad_account_ids });
  await db.from("invitations").update({ accepted_at: nowIso() }).eq("id", inv.id);
  (await cookies()).set(ORG_COOKIE, inv.organization_id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
  return true;
}
