"use server";

import type { Role } from "@adsweet/db";
import { inviteMember, revokeInvitation } from "@/lib/server/team";

export async function inviteAction(email: string, role: Role) {
  return inviteMember(email, role);
}

export async function revokeAction(id: string) {
  await revokeInvitation(id);
}
