"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { setThemePreference, type ThemePreference } from "@adsweet/ui";

const OPTIONS: ThemePreference[] = ["auto", "light", "dark"];

export function ThemeSwitch() {
  const t = useTranslations("start");
  const [pref, setPref] = useState<ThemePreference>("auto");

  useEffect(() => {
    const current = document.documentElement.dataset.themePref as ThemePreference | undefined;
    if (current) setPref(current);
  }, []);

  const label = { auto: t("themeAuto"), light: t("themeLight"), dark: t("themeDark") };

  return (
    <div role="group" aria-label={t("theme")} className="start-switch">
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
