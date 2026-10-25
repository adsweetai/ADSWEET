"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, Logo, StatusBadge } from "@adsweet/ui";
import { PERIODS, type Period } from "@/lib/period";
import type { RouteInfo } from "@/lib/routes";
import type { ShellData } from "@/lib/server/shell";
import { setPeriod } from "@/app/(app)/shell-actions";
import { Locked, useOnboardingLock } from "./OnboardingLock";
import { usePopover } from "./usePopover";

function Bell({ shell }: { shell: ShellData }) {
  const t = useTranslations("shell");
  const pop = usePopover();
  return (
    <div className="sh-bell" ref={pop.ref}>
      <button type="button" data-tour="bell" className="sh-roundbtn" aria-expanded={pop.open} aria-label={t("notifications")} onClick={pop.toggle}>
        <Icon name="bell" size={18} />
        {shell.bell.count > 0 ? <span className="sh-count">{shell.bell.count}</span> : null}
      </button>
      {pop.open ? (
        <div className="sh-bellpop">
          <div className="sh-bellpop__head">
            <b>{t("notifications")}</b>
            <Link className="as-link" href="/meldingen">
              {t("seeAll")}
            </Link>
          </div>
          {shell.bell.items.map((m) => (
            <Link key={m.id} href="/meldingen" className="sh-bellitem">
              <StatusBadge kind={m.severity === "ok" ? "ok" : m.severity} size="sm">
                {m.badge}
              </StatusBadge>
              <span className="sh-bellitem__what">{m.what}</span>
              <span className="sh-bellitem__when">{m.when}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TopBar({ shell, route, period, helpHref = "/hulp" }: { shell: ShellData; route: RouteInfo; period: Period; helpHref?: string }) {
  const t = useTranslations("shell");
  const tr = useTranslations("routes");
  const router = useRouter();
  const lock = useOnboardingLock();
  const [, start] = useTransition();
  return (
    <header className="sh-top">
      <Link href="/vandaag" aria-label="AdSweet" className="sh-top__logo">
        <Logo height={17} />
      </Link>
      <h1 className="sh-top__title">{tr(route.title)}</h1>
      {shell.labels ? <span className="sh-top__label">{route.label}</span> : null}
      <span className="sh-top__spacer" />
      {route.period ? (
        <>
          <label className="as-sr" htmlFor="periode">
            {t("period")}
          </label>
          <select
            data-tour="period"
            id="periode"
            className="sh-period"
            value={period}
            onChange={(e) =>
              start(async () => {
                await setPeriod(e.target.value as Period);
                router.refresh();
              })
            }
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {t(`periods.${p}`)}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <a data-tour="help" className="sh-roundbtn" href={helpHref} aria-label={t("pageHelp")} title={t("pageHelp")}>
        <Icon name="help" size={18} />
      </a>
      <Bell shell={shell} />
      {lock.locked ? (
        <Locked data-tour="new" className="as-btn as-btn--primary sh-newbtn" tip="end">
          <Icon name="lock" size={16} />
          {t("newCampaign")}
        </Locked>
      ) : (
        <Link data-tour="new" href="/campagnes/nieuw" className="as-btn as-btn--primary sh-newbtn" style={{ gap: 8 }}>
          <Icon name="plus" size={16} />
          {t("newCampaign")}
        </Link>
      )}
    </header>
  );
}
