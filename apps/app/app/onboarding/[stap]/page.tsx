import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getContext } from "@/lib/server/context";
import { loadOnboarding, planPrices } from "@/lib/server/onboarding";
import { Onboarding } from "../Onboarding";
import "../onboarding.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("metaTitle") };
}

export default async function OnboardingPage({ params }: { params: Promise<{ stap: string }> }) {
  const { stap } = await params;
  const ctx = await getContext();
  if (ctx.org.onboarding_done) redirect("/vandaag");
  if (ctx.role !== "eigenaar") redirect("/vandaag");
  const asked = Number(stap) || 1;
  const vm = await loadOnboarding(ctx, asked);
  // Verder dan waar je al was, kan niet. Stap 7 bestaat alleen met bestaande campagnes.
  const allowed = vm.steps.filter((n) => n <= Math.max(ctx.org.onboarding_step, 1));
  if (!vm.steps.includes(asked) || asked > Math.max(ctx.org.onboarding_step, 1)) redirect(`/onboarding/${allowed.at(-1) ?? 1}`);
  return <Onboarding vm={vm} prices={planPrices()} />;
}
