import "server-only";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { must, type Plan, type Role, type SeriesColor } from "@adsweet/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { getDb } from "./auth";
import { writeLog } from "./changes";
import { getContext, type AppContext } from "./context";

// Team en rollen (App.dc.html#team). Gebruikers per plan: Starter 1, Pro 2, Scale 5, Agency onbeperkt. Een
// open uitnodiging telt mee. Bij een bureau is het team dat van het bureau; rechten per klant staan eronder.

export interface TeamUserVM {
  id: string;
  name: string;
  sub: string;
  role: Role | null;
  initial: string;
  color: SeriesColor;
  you: boolean;
  invite: boolean;
}

export interface TeamVM {
  plan: Plan;
  users: TeamUserVM[];
  max: number | null;
  canInvite: boolean;
  full: boolean;
}

const COLORS: SeriesColor[] = ["lavendel", "salie", "tarwe", "staal", "klei"];

/** Het team: het bureau als je in Agency werkt, anders je eigen organisatie. */
const teamOrg = (ctx: AppContext) => ctx.agency ?? ctx.org;

export async function loadTeam(ctx: AppContext): Promise<TeamVM> {
  const t = await getTranslations("team");
  const db = await getDb();
  const org = teamOrg(ctx);
  const [members, invites] = await Promise.all([
    db.from("members").select().eq("organization_id", org.id).order("created_at").then(must),
    ctx.canEdit ? db.from("invitations").select().eq("organization_id", org.id).is("accepted_at", null).order("created_at").then(must) : Promise.resolve([]),
  ]);
  const profiles = members.length
    ? must(
        await db
          .from("profiles")
          .select("user_id, first_name, full_name, email")
          .in(
            "user_id",
            members.map((m) => m.user_id),
          ),
      )
    : [];
  const owner = members.find((m) => m.role === "eigenaar");
  const users: TeamUserVM[] = [
    ...members
      .sort((a, b) => Number(b === owner) - Number(a === owner))
      .map((m, i) => {
        const p = profiles.find((x) => x.user_id === m.user_id);
        const name = p?.full_name || p?.first_name || p?.email || "[teamlid]";
        return {
          id: m.id,
          name,
          sub: p?.email ?? "",
          role: m.role,
          initial: name.charAt(0).toUpperCase(),
          color: m === owner ? org.color : COLORS[i % COLORS.length],
          you: m.user_id === ctx.user.id,
          invite: false,
        };
      }),
    ...invites.map((inv) => ({
      id: inv.id,
      name: inv.email,
      sub: t("invited"),
      role: inv.role,
      initial: inv.email.charAt(0).toUpperCase(),
      color: "lavendel" as SeriesColor,
      you: false,
      invite: true,
    })),
  ];
  const plan = ctx.agency ? "agency" : ctx.plan;
  const max = PLAN_LIMITS[plan].users;
  const full = max !== null && users.length >= max;
  return { plan, users, max, canInvite: ctx.canEdit && !full, full };
}

export type InviteResult = { ok: true } | { ok: false; error: "email" | "full" | "exists" | "rights" };

export async function inviteMember(email: string, role: Role): Promise<InviteResult> {
  const ctx = await getContext();
  const t = await getTranslations("team");
  const tr = await getTranslations("roles");
  if (!ctx.canEdit) return { ok: false, error: "rights" };
  const clean = String(email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, error: "email" };
  const r: Role = role === "lezer" ? "lezer" : "beheerder";
  const team = await loadTeam(ctx);
  if (team.full) return { ok: false, error: "full" };
  if (team.users.some((u) => u.sub.toLowerCase() === clean || u.name.toLowerCase() === clean)) return { ok: false, error: "exists" };
  const db = await getDb();
  const org = teamOrg(ctx);
  await db.from("invitations").insert({ organization_id: org.id, email: clean, role: r, invited_by: ctx.user.id });
  // De mail met de link (Mails.dc.html#uitnodiging-teamlid) gaat uit via packages/mails.
  await writeLog(db, { ...ctx, org }, { kind: "wijziging", what: t("log"), from_to: t("logSub", { email: clean, role: tr(r) }) });
  revalidatePath("/team");
  return { ok: true };
}

export async function revokeInvitation(id: string) {
  const ctx = await getContext();
  if (!ctx.canEdit) return;
  const db = await getDb();
  await db.from("invitations").delete().eq("id", id).eq("organization_id", teamOrg(ctx).id).is("accepted_at", null);
  revalidatePath("/team");
}
