"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, TrialBar } from "@adsweet/ui";
import { AppToastProvider } from "@/components/ui";
import type { Period } from "@/lib/period";
import { hasPlan } from "@/lib/plans";
import { NAV_BOTTOM, NAV_CLIENTS, NAV_EXTRA_MOBILE, NAV_MAIN, NEEDS_ONBOARDING, routeInfo, type NavItem } from "@/lib/routes";
import type { ShellData } from "@/lib/server/shell";
import { DotLauncher } from "@/components/dot/DotLauncher";
import { Terms } from "@/components/dot/Terms";
import { Tours } from "@/components/dot/Tours";
import { DemoPanel } from "./DemoPanel";
import { GateProvider } from "./Gate";
import { OnboardingLockProvider } from "./OnboardingLock";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";

/** De buitenkant van de app: zijbalk (computer) of tabbalk (gsm), bovenbalk, proefperiode, banners, meldingen. */
export function AppShell({ shell, period, children }: { shell: ShellData; period: Period; children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("shell");
  const tr = useTranslations("routes");
  const route = routeInfo(pathname);

  // Starter ziet Studio en Concurrenten niet in de navigatie (geen AI).
  const main: NavItem[] = [...(shell.isAgency ? [NAV_CLIENTS] : []), ...NAV_MAIN].filter((i) => !(i.min === "pro" && !hasPlan(shell.plan, "pro")));
  // Zonder onboarding: wat je gegevens nodig heeft, staat op slot (met uitleg).
  const nav = main.map((item) => ({
    item,
    locked: !!item.min && !hasPlan(shell.plan, item.min),
    onboarding: shell.onboarding.locked && NEEDS_ONBOARDING.has(item.id),
  }));
  const tabIds = new Set(["vandaag", "campagnes", "inzichten"]);
  const more = [
    ...nav.filter((n) => !tabIds.has(n.item.id)),
    ...[...NAV_BOTTOM, ...NAV_EXTRA_MOBILE].map((item) => ({ item, locked: false, onboarding: false })),
  ];

  return (
    <AppToastProvider>
      <OnboardingLockProvider locked={shell.onboarding.locked} href={shell.onboarding.href}>
        <GateProvider>
          <div className="sh" data-screen-label={`App · ${route.id}`}>
            {shell.trial ? <TrialBar warn={shell.trial.warn} text={shell.trial.text} link={{ label: t("manage"), href: "/abonnement" }} /> : null}
            <div className="sh-row">
              <Sidebar shell={shell} nav={nav} active={route.group} />
              <div className="sh-body">
                <TopBar shell={shell} route={route} period={period} />
                {shell.banner ? (
                  <div role="alert" className={["sh-banner", shell.banner.kind === "warn" && "sh-banner--warn"].filter(Boolean).join(" ")}>
                    <span className="sh-banner__text">
                      <Icon name={shell.banner.kind} size={16} />
                      {shell.banner.text}
                    </span>
                    <a className="as-link" href={shell.banner.href}>
                      {shell.banner.button}
                    </a>
                  </div>
                ) : null}
                <main className="sh-main" id="inhoud">
                  {route.id !== "vandaag" ? <h1 className="sh-main__title">{tr(route.title)}</h1> : null}
                  {shell.inClient ? (
                    <div className="sh-client">
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="sh-client__mark" aria-hidden="true">
                          {shell.inClient.agency.slice(shell.inClient.agency.lastIndexOf(" ") + 1, shell.inClient.agency.lastIndexOf(" ") + 2)}
                        </span>
                        <span>{t.rich("inClient", { agency: shell.inClient.agency, client: shell.inClient.client, b: (c) => <b>{c}</b> })}</span>
                      </span>
                      <ClientBack />
                    </div>
                  ) : null}
                  {children}
                </main>
              </div>
            </div>
            <TabBar active={route.group} isNew={route.id === "campagneNieuw"} more={more} />
            {shell.dot ? <DotLauncher balloon={shell.dot.balloon} account={shell.account.name} firstName={shell.user.name} /> : null}
            <Tours seen={shell.toursSeen} hasAI={shell.hasAI} onboarding={shell.onboarding} />
            <Terms examples={shell.glossary} />
            {shell.demo.enabled ? <DemoPanel shell={shell} /> : null}
          </div>
        </GateProvider>
      </OnboardingLockProvider>
    </AppToastProvider>
  );
}

function ClientBack() {
  const t = useTranslations("shell");
  return (
    <form action="/klanten/terug" method="post">
      <button type="submit" className="as-textbtn" style={{ color: "var(--on-series)", borderColor: "var(--on-series)" }}>
        {t("backToClients")}
      </button>
    </form>
  );
}
