import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthError } from "@/components/auth/AuthError";
import { Testfase } from "@/components/auth/Testfase";
import { isDemo } from "@/lib/env";
import { PLAN_NAME } from "@/lib/plans";
import { currentUser } from "@/lib/server/auth";
import { testfaseOn } from "@/lib/server/testfase";
import { Signup } from "./Signup";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signupLink") };
}

const ERRORS = ["perm", "noacc", "expired"] as const;

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string; periode?: string; fout?: string }> }) {
  const sp = await searchParams;
  if (await currentUser()) redirect("/vandaag");
  if (await testfaseOn()) return <Testfase />;
  const t = await getTranslations("auth");
  const error = ERRORS.find((e) => e === sp.fout);
  if (error) return <AuthError error={error} context="signup" demo={isDemo} />;
  const plan = sp.plan === "starter" || sp.plan === "pro" || sp.plan === "scale" || sp.plan === "agency" ? PLAN_NAME[sp.plan] : null;
  const chip = plan ? `${plan} · ${sp.periode === "jaar" ? t("yearly") : t("monthly")}` : null;
  return <Signup chip={chip} demo={isDemo} />;
}
