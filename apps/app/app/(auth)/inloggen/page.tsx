import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isDemo } from "@/lib/env";
import { DEMO_LOGINS } from "@/lib/demo-accounts";
import { currentUser } from "@/lib/server/auth";
import { AuthError } from "@/components/auth/AuthError";
import { Testfase } from "@/components/auth/Testfase";
import { testfaseOn } from "@/lib/server/testfase";
import { LoginForm } from "./LoginForm";

const ERRORS = ["perm", "noacc", "expired"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginLink") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; fout?: string; mail?: string }> }) {
  const sp = await searchParams;
  if (await currentUser()) redirect(sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/vandaag");
  const error = ERRORS.find((e) => e === sp.fout);
  if (error) return <AuthError error={error} context="login" demo={isDemo} />;
  // In de testfase kan alleen wie uitgenodigd is binnen; teamleden loggen in met hun e-mail.
  if (sp.mail !== "1" && sp.fout !== "link" && (await testfaseOn())) return <Testfase showLogin />;
  return <LoginForm next={sp.next} linkInvalid={sp.fout === "link"} mailOpen={sp.mail === "1"} demo={isDemo} demoEmails={isDemo ? DEMO_LOGINS : []} />;
}
