"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Logo, Meter, Steps } from "@adsweet/ui";
import type { OnboardingVM } from "@/lib/server/onboarding";
import { VMProvider } from "./shared";
import { StepProfile, StepWebsite, StepWelcome } from "./steps/Start";
import { StepGoal, StepNumbers } from "./steps/Goals";
import { StepConnect, StepExisting } from "./steps/Connect";
import { StepFirstCampaign, StepStrategy } from "./steps/Campaign";
import { StepLive, StepPlan, type Prices } from "./steps/Plan";

/** De onboarding (Inloggen.dc.html#onboarding-1 … 11): links de stappen, rechts één stap per scherm. */
export function Onboarding({ vm, prices }: { vm: OnboardingVM; prices: Prices }) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const titles = t.raw("steps") as string[];
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
          <Logo height={18} />
          <span className="ob-saved">{t("saved")}</span>
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
            <div className="ob-step" key={vm.step}>
              {body}
            </div>
          </main>
        </div>
      </div>
    </VMProvider>
  );
}
