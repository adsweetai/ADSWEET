import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { createOwnOrganization } from "@/lib/server/onboarding";

/** Eerste keer ingelogd zonder organisatie: maak de organisatie aan en begin bij stap 1. */
export default async function StartPage() {
  if (!(await currentUser())) redirect("/account-maken");
  await createOwnOrganization();
  redirect("/onboarding/1");
}
