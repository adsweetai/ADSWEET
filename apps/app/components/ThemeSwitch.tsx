"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { setThemePreference, type ThemePreference } from "@adsweet/ui";

const OPTIONS: ThemePreference[] = ["auto", "light", "dark"];

/** Kiest licht, nacht of volgt het toestel. De keuze blijft bewaard in een cookie. */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("common");
  const [pref, setPref] = useState<ThemePreference>("auto");

  useEffect(() => {
    const current = document.documentElement.dataset.themePref as ThemePreference | undefined;
    if (current) setPref(current);
  }, []);

  const label = { auto: t("themeAuto"), light: t("themeLight"), dark: t("themeDark") };

  return (
    <div role="group" aria-label={t("theme")} className={className}>
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={pref === o}
          onClick={() => {
            setThemePreference(o);
            setPref(o);
          }}
        >
          {label[o]}
        </button>
      ))}
    </div>
  );
}
