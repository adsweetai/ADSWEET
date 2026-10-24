"use client";

import Link from "next/link";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Icon } from "@adsweet/ui";
import type { OnboardingVM } from "@/lib/server/onboarding";
import { goStep } from "./actions";

const Ctx = createContext<OnboardingVM | null>(null);
export const VMProvider = Ctx.Provider;
export function useVM() {
  const vm = useContext(Ctx);
  if (!vm) throw new Error("Geen onboarding");
  return vm;
}

/** Naar de vorige of volgende stap. `save` bewaart eerst; geeft het false terug, dan blijf je staan. */
export function useStepNav() {
  const vm = useVM();
  const router = useRouter();
  const [pending, start] = useTransition();
  const idx = vm.steps.indexOf(vm.step);
  const nextStep = vm.steps[Math.min(vm.steps.length - 1, idx + 1)];
  const prevStep = idx > 0 ? vm.steps[idx - 1] : null;
  const go = (n: number) =>
    start(async () => {
      await goStep(n);
      router.push(`/onboarding/${n}`);
      window.scrollTo(0, 0);
    });
  const next = (save?: () => Promise<boolean | void>) =>
    start(async () => {
      if (save && (await save()) === false) return;
      await goStep(nextStep);
      router.push(`/onboarding/${nextStep}`);
      window.scrollTo(0, 0);
    });
  return { pending, start, next, go, prev: prevStep ? () => router.push(`/onboarding/${prevStep}`) : null, nextStep };
}

export function StepFooter({
  prev,
  label,
  onNext,
  disabled,
  pending,
}: {
  prev: (() => void) | null;
  label: string;
  onNext: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  const t = useTranslations("onboarding");
  return (
    <div className="ob-foot">
      {prev ? (
        <Button variant="secondary" onClick={prev}>
          {t("prev")}
        </Button>
      ) : (
        <span />
      )}
      <Button arrow onClick={onNext} disabled={disabled || pending} aria-busy={pending}>
        {label}
      </Button>
    </div>
  );
}

/** "Tip uit het playbook." met een gloeilamp, en eventueel een link naar de Academy. */
export function ObTip({ children, more }: { children: ReactNode; more?: boolean }) {
  const t = useTranslations("onboarding");
  return (
    <aside className="ob-tip">
      <Icon name="bulb" size={16} />
      <span>
        <b>{t("tip")}.</b> {children}{" "}
        {more ? (
          <Link className="as-link" href="/academy">
            {t("more")}
          </Link>
        ) : null}
      </span>
    </aside>
  );
}

export const num = (v: string) =>
  Number(
    String(v)
      .replace(/[€%\s]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  ) || 0;
