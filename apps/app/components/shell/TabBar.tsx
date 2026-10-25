"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@adsweet/ui";
import { NEEDS_ONBOARDING, type NavItem } from "@/lib/routes";
import { Locked, useOnboardingLock } from "./OnboardingLock";
import { usePopover } from "./usePopover";

const TABS: { id: string; href: string; icon: IconName; label: string }[] = [
  { id: "vandaag", href: "/vandaag", icon: "today", label: "vandaag" },
  { id: "campagnes", href: "/campagnes", icon: "layers", label: "campagnes" },
  { id: "nieuw", href: "/campagnes/nieuw", icon: "plus", label: "nieuw" },
  { id: "inzichten", href: "/inzichten", icon: "chart", label: "inzichten" },
];

/** Gsm: vijf knoppen onderaan (Vandaag, Campagnes, Nieuw, Inzichten, Meer). */
export function TabBar({ active, isNew, more }: { active: string; isNew: boolean; more: { item: NavItem; locked: boolean; onboarding: boolean }[] }) {
  const t = useTranslations("nav");
  const pop = usePopover<HTMLDivElement>();
  const lock = useOnboardingLock();
  return (
    <div ref={pop.ref}>
      <nav data-tour="nav" aria-label={t("main")} className="sh-tabs">
        {TABS.map((tab) => {
          const on = tab.id === "nieuw" ? isNew : active === tab.id && !isNew;
          if (lock.locked && NEEDS_ONBOARDING.has(tab.id))
            return (
              <Locked key={tab.id} className={["sh-tab", tab.id === "nieuw" && "sh-tab--new"].filter(Boolean).join(" ")}>
                <span className="sh-tab__icon">
                  <Icon name={tab.id === "nieuw" ? "lock" : tab.icon} size={20} />
                </span>
                {t(tab.label)}
              </Locked>
            );
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={["sh-tab", tab.id === "nieuw" && "sh-tab--new"].filter(Boolean).join(" ")}
              aria-current={on ? "page" : undefined}
            >
              <span className="sh-tab__icon">
                <Icon name={tab.icon} size={20} />
              </span>
              {t(tab.label)}
            </Link>
          );
        })}
        <button type="button" className="sh-tab" aria-expanded={pop.open} onClick={pop.toggle}>
          <span className="sh-tab__icon">
            <Icon name="more" size={20} />
          </span>
          {t("meer")}
        </button>
      </nav>
      {pop.open ? (
        <div role="dialog" aria-label={t("meer")} className="sh-more">
          {more.map(({ item, locked, onboarding }) =>
            onboarding ? (
              <Locked key={item.id + item.href} className="sh-moreitem">
                <Icon name={item.icon} size={18} />
                {t(item.id)}
                <Icon name="lock" size={13} />
              </Locked>
            ) : (
              <Link key={item.id + item.href} href={item.href} onClick={() => pop.setOpen(false)}>
                <Icon name={item.icon} size={18} />
                {t(item.id)}
                {locked ? <Icon name="lock" size={13} /> : null}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
