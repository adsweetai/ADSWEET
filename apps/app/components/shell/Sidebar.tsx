"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar, Icon, Logo, Meter, setThemePreference, useTheme } from "@adsweet/ui";
import type { ShellData } from "@/lib/server/shell";
import { NAV_BOTTOM, type NavItem } from "@/lib/routes";
import { selectAccount, selectOrg } from "@/app/(app)/shell-actions";
import { Locked } from "./OnboardingLock";
import { usePopover } from "./usePopover";

export function AccountPicker({ shell }: { shell: ShellData }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const pop = usePopover();
  const [q, setQ] = useState("");
  const [, start] = useTransition();
  const a = shell.account;
  const list = a.list.filter((i) => !q || i.kind === "all" || i.name.toLowerCase().includes(q.toLowerCase()));
  const pick = (id: string, kind: string) =>
    start(async () => {
      pop.setOpen(false);
      if (shell.isAgency) {
        await selectOrg(id);
        router.push(kind === "all" ? "/klanten" : "/vandaag");
      } else {
        await selectAccount(id);
        if (kind === "all") router.push("/vandaag");
      }
      router.refresh();
    });
  return (
    <div className="sh-picker" ref={pop.ref}>
      <button type="button" data-tour="account" className="sh-pickbtn" aria-expanded={pop.open} onClick={pop.toggle}>
        <Avatar initial={a.initial} color={a.color} />
        <span className="sh-pickbtn__text">
          <b>{a.name}</b>
          <span>{t("metaSub", { sub: a.sub })}</span>
        </span>
        <Icon name="chev" size={14} />
      </button>
      {pop.open ? (
        <div className="sh-pop sh-pop--down">
          {a.multi ? (
            <input type="search" placeholder={t("searchAccount")} aria-label={t("searchAccount")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          ) : null}
          {list.map((i) => (
            <button key={i.id || "all"} type="button" className="sh-popitem" aria-current={i.active} onClick={() => pick(i.id, i.kind)}>
              <span>{i.name}</span>
              <span>{i.sub}</span>
            </button>
          ))}
          {!a.multi ? (
            <Link className="sh-popnote" href="/instellingen/accounts">
              {t("addAccountScale")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function NavLink({
  item,
  label,
  active,
  locked,
  onboarding,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  locked?: boolean;
  onboarding?: boolean;
}) {
  if (onboarding)
    return (
      <Locked className="sh-navitem">
        <Icon name={item.icon} size={18} />
        <span className="sh-navitem__label">{label}</span>
        <Icon name="lock" size={13} />
      </Locked>
    );
  return (
    <Link href={item.href} className="sh-navitem" aria-current={active ? "page" : undefined}>
      <Icon name={item.icon} size={18} />
      <span className="sh-navitem__label">{label}</span>
      {locked ? <Icon name="lock" size={13} /> : null}
    </Link>
  );
}

function UserMenu({ shell }: { shell: ShellData }) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const pop = usePopover();
  const theme = useTheme();
  return (
    <div className="sh-user" ref={pop.ref}>
      <button type="button" className="sh-pickbtn" aria-expanded={pop.open} onClick={pop.toggle}>
        <Avatar initial={shell.user.initial} color={shell.account.color} />
        <span className="sh-pickbtn__text">
          <b>{shell.user.name}</b>
          <span>{shell.user.plan}</span>
        </span>
      </button>
      {pop.open ? (
        <div className="sh-pop sh-pop--up">
          {shell.credits ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>{shell.credits.text}</span>
              <Meter value={shell.credits.left} max={shell.credits.total} label={t("creditsAria")} />
            </div>
          ) : null}
          <div className="sh-langs" role="group" aria-label={tc("language")}>
            {["nl", "fr", "en"].map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={l === "nl"}
                aria-disabled={l !== "nl" || undefined}
                title={l === "nl" ? undefined : tc("languageLater")}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="sh-themebtn" onClick={() => setThemePreference(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? t("themeToLight") : t("themeToDark")}
          </button>
          <form action="/auth/uitloggen" method="post">
            <button type="submit" className="sh-logout">
              {t("logout")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({ shell, nav, active }: { shell: ShellData; nav: { item: NavItem; locked: boolean; onboarding: boolean }[]; active: string }) {
  const t = useTranslations("nav");
  return (
    <aside data-tour="nav" aria-label={t("main")} className="sh-side">
      <Link href="/vandaag" aria-label={t("toToday")} className="sh-logo">
        <Logo height={19} />
      </Link>
      <AccountPicker shell={shell} />
      <nav className="sh-nav">
        {nav.map(({ item, locked, onboarding }) => (
          <NavLink key={item.id} item={item} label={t(item.id)} active={active === item.id} locked={locked} onboarding={onboarding} />
        ))}
      </nav>
      <div className="sh-sidefoot">
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.id} item={item} label={t(item.id)} active={active === item.id} />
        ))}
        <UserMenu shell={shell} />
      </div>
    </aside>
  );
}
