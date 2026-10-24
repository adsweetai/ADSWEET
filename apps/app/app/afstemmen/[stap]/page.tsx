import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getContext } from "@/lib/server/context";
import { TUNING_STEPS, loadTuning } from "@/lib/server/tuning";
import { Tuning } from "../Tuning";
import "../../(app)/campagnes/campagnes.css";
import "../../onboarding/onboarding.css";
import "../afstemmen.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tuning");
  return { title: t("metaTitle") };
}

/** Onboardingpaneel "Stem AdSweet af op je zaak" (Onboardingpaneel.dc.html), 8 stappen. */
export default async function TuningPage({ params }: { params: Promise<{ stap: string }> }) {
  const { stap } = await params;
  const ctx = await getContext();
  if (!ctx.canEdit) redirect("/vandaag");
  const n = Number(stap);
  if (!Number.isInteger(n) || n < 1 || n > TUNING_STEPS) redirect("/afstemmen/1");
  const vm = await loadTuning(ctx, n);
  return <Tuning vm={vm} />;
}
