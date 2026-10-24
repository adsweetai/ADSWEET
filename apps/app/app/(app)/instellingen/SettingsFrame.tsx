import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SETTINGS_PAGES, type SettingsPage } from "@/lib/routes";
import { NavScroll } from "./NavScroll";
import "./instellingen.css";

const OWN_ROUTE = new Set<SettingsPage>(["team", "abonnement", "doorverwijzen"]);
export const settingsHref = (id: SettingsPage) => (OWN_ROUTE.has(id) ? `/${id}` : `/instellingen/${id}`);

/** Instellingen: links de 14 onderdelen, rechts het gekozen onderdeel (App.dc.html#instellingen-…). */
export async function SettingsFrame({ current, children }: { current: SettingsPage; children: ReactNode }) {
  const t = await getTranslations("settings");
  return (
    <div className="st">
      <nav aria-label={t("navAria")} className="st-nav">
        {SETTINGS_PAGES.map((id) => (
          <Link key={id} href={settingsHref(id)} aria-current={id === current ? "page" : undefined} className="st-nav__item">
            {t(`subs.${id}`)}
            {id === "ontwikkelaars" ? <span className="st-nav__tag">{t("later")}</span> : null}
          </Link>
        ))}
        <NavScroll />
      </nav>
      <section className="st-main" aria-labelledby="st-title">
        <h2 id="st-title" className="st-title">
          {t(`subs.${current}`)}
        </h2>
        {children}
      </section>
    </div>
  );
}
