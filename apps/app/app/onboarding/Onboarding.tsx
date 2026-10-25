"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DotCharacter, Logo, Meter, Steps } from "@adsweet/ui";
import type { OnboardingVM } from "@/lib/server/onboarding";
import { VMProvider } from "./shared";
import { StepProfile, StepWebsite, StepWelcome } from "./steps/Start";
import { StepGoal, StepNumbers } from "./steps/Goals";
import { StepConnect, StepExisting } from "./steps/Connect";
import { StepFirstCampaign, StepStrategy } from "./steps/Campaign";
import { StepLive, StepPlan, type Prices } from "./steps/Plan";

/**
 * De onboarding (Inloggen.dc.html#onboarding-1 … 11): links de stappen, rechts één stap per scherm, met Dot die bij
 * elke stap kort uitlegt. Je komt hier vanuit de app (de rondleiding of de kaart op Vandaag) en kan altijd terug.
 */
export function Onboarding({ vm, prices }: { vm: OnboardingVM; prices: Prices }) {
  const t = useTranslations("onboarding");
  const tn = useTranslations("nav");
  const router = useRouter();
  const titles = t.raw("steps") as string[];
  const say = t.raw("say") as string[];
  const idx = Math.max(0, vm.steps.indexOf(vm.step));
  const reachedIdx = vm.steps.filter((n) => n <= vm.reached).length - 1;
  const minutes = Math.max(0, Math.round((8 * (vm.steps.length - 1 - idx)) / (vm.steps.length - 1)));
  const left = minutes ? t("minLeft", { n: minutes }) : t("almost");
  const body = {
    1: <StepWelcome />,
    2: <StepWebsite />,
    3: <StepProfile />,
    4: <StepGoal />,
    5: <StepNumbers />,
    6: <StepConnect />,
    7: <StepExisting />,
    8: <StepStrategy />,
    9: <StepFirstCampaign />,
    10: <StepPlan prices={prices} />,
    11: <StepLive />,
  }[vm.step];

  return (
    <VMProvider value={vm}>
      <div className="ob">
        <header className="ob-head">
          <Link href="/vandaag" aria-label={tn("toToday")}>
            <Logo height={18} />
          </Link>
          <span className="ob-headright">
            <span className="ob-saved">{t("saved")}</span>
            <Link className="as-link as-small" href="/vandaag">
              {t("backToApp")}
            </Link>
          </span>
        </header>
        <div className="ob-body">
          <nav className="ob-nav" aria-label={t("stepsLabel")}>
            <span className="ob-left">{left}</span>
            <Steps
              label={t("stepsLabel")}
              steps={vm.steps.map((n) => titles[n - 1])}
              current={idx + 1}
              reached={reachedIdx + 1}
              onPick={(n) => router.push(`/onboarding/${vm.steps[n - 1]}`)}
            />
          </nav>
          <main className="ob-main">
            <div className="ob-mobile">
              <div>
                <span>{t("stepOf", { a: idx + 1, b: vm.steps.length })}</span>
                <span>{left}</span>
              </div>
              <Meter value={idx + 1} max={vm.steps.length} label={t("stepsLabel")} thin role="progressbar" />
            </div>
            {vm.hasAI ? (
              <div className="ob-dot">
                <DotCharacter size={64} mood={vm.step === 11 ? "viert" : "praat"} label="Dot" />
                <span role="status" aria-live="polite" className="ob-say">
                  {say[vm.step - 1]}
                </span>
              </div>
            ) : null}
            <div className="ob-step" key={vm.step}>
              {body}
            </div>
          </main>
        </div>
      </div>
    </VMProvider>
  );
}
