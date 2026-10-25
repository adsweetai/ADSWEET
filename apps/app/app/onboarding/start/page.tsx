import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { createOwnOrganization } from "@/lib/server/onboarding";

/** Eerste keer ingelogd zonder organisatie: maak de organisatie aan en ga naar Vandaag, waar de rondleiding begint. */
export default async function StartPage() {
  if (!(await currentUser())) redirect("/account-maken");
  await createOwnOrganization();
  redirect("/vandaag");
}
