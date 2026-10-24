"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setThemePreference, type ThemePreference } from "@adsweet/ui";
import type { ShellData } from "@/lib/server/shell";
import { demoLabels, demoPlan, demoReset, demoScenario, demoState } from "@/app/(app)/shell-actions";

const PLAN_FOR: Record<string, string> = { lisa: "pro", tom: "starter", sarah: "pro", bram: "scale", eva: "agency" };

/** Het demopaneel. Hoort niet bij het product: wisselt scenario, plan, staat, thema en labels. */
export function DemoPanel({ shell }: { shell: ShellData }) {
  const t = useTranslations("demo");
  const tp = useTranslations("plans");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState<ThemePreference>(() =>
    typeof document === "undefined" ? "auto" : ((document.documentElement.dataset.themePref as ThemePreference) ?? "auto"),
  );
  const d = shell.demo;
  const run = (fn: () => Promise<unknown>, to?: string) =>
    start(async () => {
      await fn();
      if (to) router.push(to);
      router.refresh();
    });
  const plan = d.plan ?? shell.plan;
  const group = (title: string, opts: { key: string; label: string; on: boolean; pick: () => void; disabled?: boolean }[]) => (
    <div className="sh-demo__group" key={title}>
      <span>{title}</span>
      <div className="sh-demo__opts">
        {opts.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={o.on}
            aria-disabled={o.disabled || undefined}
            disabled={pending}
            onClick={() => !o.disabled && o.pick()}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="sh-demo">
      {open ? (
        <div role="dialog" aria-label={t("title")} className="sh-demo__panel">
          <div className="sh-demo__head">
            <span style={{ fontWeight: 500 }}>{t("title")}</span>
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{t("note")}</span>
          </div>
          {group(
            t("groups.scenario"),
            ["lisa", "tom", "sarah", "bram", "eva"].map((s) => ({
              key: s,
              label: t(`scenario.${s}`),
              on: d.scenario === s,
              pick: () => run(() => demoScenario(s), s === "eva" ? "/klanten" : "/vandaag"),
            })),
          )}
          {group(
            t("groups.plan"),
            ["starter", "pro", "scale", "agency"].map((p) => ({
              key: p,
              label: tp(p),
              on: plan === p,
              pick: () => run(() => demoPlan(p === PLAN_FOR[d.scenario ?? ""] ? "" : p)),
            })),
          )}
          {group(
            t("groups.staat"),
            ["normaal", "proef", "credits", "betaal", "koppeling", "testfase"].map((s) => ({
              key: s,
              label: t(`staat.${s}`),
              on: d.state === s,
              pick: () => run(() => demoState(s)),
            })),
          )}
          {group(
            t("groups.theme"),
            (["auto", "light", "dark"] as ThemePreference[]).map((th) => ({
              key: th,
              label: tc(th === "auto" ? "themeAuto" : th === "light" ? "themeLight" : "themeDark"),
              on: theme === th,
              pick: () => {
                setThemePreference(th);
                setTheme(th);
              },
            })),
          )}
          {group(
            t("groups.lang"),
            ["nl", "fr", "en"].map((l) => ({ key: l, label: l.toUpperCase(), on: l === "nl", pick: () => undefined, disabled: l !== "nl" })),
          )}
          {group(t("groups.labels"), [
            { key: "uit", label: t("labels.uit"), on: !d.labels, pick: () => run(() => demoLabels(false)) },
            { key: "aan", label: t("labels.aan"), on: d.labels, pick: () => run(() => demoLabels(true)) },
          ])}
          <div className="sh-demo__foot">
            <span>{t("date")}</span>
            <button type="button" className="as-textbtn" style={{ fontSize: 12.5 }} disabled={pending} onClick={() => run(() => demoReset())}>
              {t("reset")}
            </button>
          </div>
        </div>
      ) : null}
      <button type="button" className="sh-demo__btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t("button")}
      </button>
    </div>
  );
}
