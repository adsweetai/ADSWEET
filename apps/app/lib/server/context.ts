import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { must, type AdAccount, type Member, type Organization, type Plan, type Profile, type Role } from "@adsweet/db";
import { hasPlan } from "@/lib/plans";
import { currentUser, getDb, type SessionUser } from "./auth";
import { demoOverrides, type DemoOverrides } from "./demo-state";

export const ORG_COOKIE = "as-org";
export const ACCOUNT_COOKIE = "as-account";

export interface AppContext {
  user: SessionUser;
  profile: Profile;
  /** De organisatie waarin je nu werkt (bij Agency: het bureau of een klant). */
  org: Organization;
  /** Het plan dat geldt (bij een klant van een bureau: Agency; in de demo eventueel overschreven). */
  plan: Plan;
  /** Je rol in die organisatie (bij een klant van een bureau: je rol in het bureau). */
  role: Role;
  canEdit: boolean;
  /** Alle organisaties die je mag zien. */
  orgs: Organization[];
  memberships: Member[];
  /** Het bureau waartoe je hoort, als je in Agency werkt. */
  agency: Organization | null;
  /** De klanten van het bureau die je mag zien. */
  clients: Organization[];
  /** Werk je nu in een klant van je bureau? */
  inClient: boolean;
  adAccounts: AdAccount[];
  /** Het gekozen advertentieaccount (standaard het eerste). */
  account: AdAccount | null;
  demo: DemoOverrides;
}

/** De context van de ingelogde gebruiker. Leidt naar /inloggen als er niemand ingelogd is. */
export const getContext = cache(async (): Promise<AppContext> => {
  const user = await currentUser();
  if (!user) redirect("/inloggen");
  const db = await getDb();
  const [profile, memberships, orgs, demo] = await Promise.all([
    db.from("profiles").select().eq("user_id", user.id).single().then(must),
    db.from("members").select().eq("user_id", user.id).then(must),
    db.from("organizations").select().order("created_at").then(must),
    demoOverrides(),
  ]);
  // Een nieuwe klant zonder organisatie begint de onboarding (die maakt de organisatie aan).
  if (!memberships.length || !orgs.length) redirect("/onboarding/start");

  const direct = orgs.filter((o) => memberships.some((m) => m.organization_id === o.id));
  const agency = direct.find((o) => o.plan === "agency" && !o.agency_parent_id) ?? null;
  const clients = agency ? orgs.filter((o) => o.agency_parent_id === agency.id).sort((a, b) => clientOrder(a) - clientOrder(b)) : [];
  const store = await cookies();
  const wanted = store.get(ORG_COOKIE)?.value;
  const org = orgs.find((o) => o.id === wanted) ?? direct[0] ?? orgs[0];
  const own = memberships.find((m) => m.organization_id === org.id);
  const viaAgency = memberships.find((m) => m.organization_id === org.agency_parent_id);
  const role = (own ?? viaAgency ?? memberships[0]).role;
  const inClient = !!agency && org.agency_parent_id === agency.id;
  const plan = demo.plan ?? (inClient ? "agency" : org.plan);

  const adAccounts = must(await db.from("ad_accounts").select().eq("organization_id", org.id).order("sort"));
  const wantedAcc = store.get(ACCOUNT_COOKIE)?.value;
  const account = adAccounts.find((a) => a.id === wantedAcc) ?? adAccounts[0] ?? null;

  return { user, profile, org, plan, role, canEdit: role !== "lezer", orgs, memberships, agency, clients, inClient, adAccounts, account, demo };
});

// Volgorde van de klanten zoals in het prototype (aanmaakmoment).
const clientOrder = (o: Organization) => Date.parse(o.created_at);

/** Gooit een fout als de gebruiker niet mag wijzigen. Voor server actions. */
export function assertCanEdit(ctx: AppContext) {
  if (!ctx.canEdit) throw new Error("Je rol laat geen wijzigingen toe.");
}

/** Gate op de server: functies buiten het plan worden geweigerd, niet alleen verborgen. */
export function assertPlan(ctx: AppContext, min: Plan) {
  if (!hasPlan(ctx.plan, min)) throw new Error(`Dit zit in ${min}.`);
}
