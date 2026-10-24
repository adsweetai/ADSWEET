import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { must, type Member, type Organization, type Profile, type Role } from "@adsweet/db";
import { currentUser, getDb, type SessionUser } from "./auth";

export const ORG_COOKIE = "as-org";

export interface AppContext {
  user: SessionUser;
  profile: Profile;
  /** De organisatie waarin je nu werkt (bij Agency: het bureau of een klant). */
  org: Organization;
  /** Je rol in die organisatie (bij een klant van een bureau: je rol in het bureau). */
  role: Role;
  /** Alle organisaties die je mag zien. */
  orgs: Organization[];
  memberships: Member[];
  /** Het bureau waartoe je hoort, als je in Agency werkt. */
  agency: Organization | null;
}

/** De context van de ingelogde gebruiker. Leidt naar /inloggen als er niemand ingelogd is. */
export const getContext = cache(async (): Promise<AppContext> => {
  const user = await currentUser();
  if (!user) redirect("/inloggen");
  const db = await getDb();
  const [profile, memberships, orgs] = await Promise.all([
    db.from("profiles").select().eq("user_id", user.id).single().then(must),
    db.from("members").select().eq("user_id", user.id).then(must),
    db.from("organizations").select().order("created_at").then(must),
  ]);
  if (!memberships.length || !orgs.length) redirect("/inloggen");

  const direct = orgs.filter((o) => memberships.some((m) => m.organization_id === o.id));
  const agency = direct.find((o) => o.plan === "agency" && !o.agency_parent_id) ?? null;
  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const org = orgs.find((o) => o.id === wanted) ?? direct[0] ?? orgs[0];
  const own = memberships.find((m) => m.organization_id === org.id);
  const viaAgency = memberships.find((m) => m.organization_id === org.agency_parent_id);
  const role = (own ?? viaAgency ?? memberships[0]).role;
  return { user, profile, org, role, orgs, memberships, agency };
});
