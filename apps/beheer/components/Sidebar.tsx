"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Logo, setThemePreference, type ThemePreference } from "@adsweet/ui";

export const SECTIONS = [
  "playbook",
  "versies",
  "strategieen",
  "teksten",
  "academy",
  "klanten",
  "ai-kosten",
  "kortingscodes",
  "partners",
  "calls",
  "systeem",
] as const;
export type Section = (typeof SECTIONS)[number];

/** De zijbalk van Beheer: logo, de 11 onderdelen, het thema en uitloggen. */
export function Sidebar({ email }: { email: string }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const path = usePathname();
  const [pref, setPref] = useState<ThemePreference>("auto");
  useEffect(() => {
    const cur = document.documentElement.dataset.themePref as ThemePreference | undefined;
    if (cur) setPref(cur);
  }, []);
  return (
    <aside className="bh-side">
      <span className="bh-brand">
        <Logo alt={tc("logoAlt")} />
        <span className="bh-tag">{tc("tag")}</span>
      </span>
      <nav aria-label={tc("navAria")} className="bh-nav">
        {SECTIONS.map((s) => (
          <Link key={s} href={`/${s}`} aria-current={path === `/${s}` ? "page" : undefined}>
            {t(s)}
          </Link>
        ))}
      </nav>
      <div className="bh-foot">
        <div role="group" aria-label={tc("theme")} className="bh-theme">
          {(["auto", "light", "dark"] as ThemePreference[]).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={pref === o}
              onClick={() => {
                setThemePreference(o);
                setPref(o);
              }}
            >
              {tc(o === "auto" ? "themeAuto" : o === "light" ? "themeLight" : "themeDark")}
            </button>
          ))}
        </div>
        <span className="bh-foot__who">{email}</span>
        <form action="/auth/uitloggen" method="post">
          <button type="submit" className="as-textbtn">
            {tc("logout")}
          </button>
        </form>
      </div>
    </aside>
  );
}
