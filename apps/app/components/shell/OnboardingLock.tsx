"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@adsweet/ui";

// Op slot tot de onboarding af is: een slotje met uitleg bij het aanwijzen of de focus, en bij een klik een sober
// paneel met de weg naar de onboarding (alleen de eigenaar vult ze in).

const Ctx = createContext<{ locked: boolean; open: () => void }>({ locked: false, open: () => {} });

export const useOnboardingLock = () => useContext(Ctx);

export function OnboardingLockProvider({ locked, href, children }: { locked: boolean; href: string | null; children: ReactNode }) {
  const t = useTranslations("shell.onboardingLock");
  const [show, setShow] = useState(false);
  const open = useCallback(() => setShow(true), []);
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShow(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);
  return (
    <Ctx.Provider value={{ locked, open }}>
      {children}
      {show ? (
        <div className="sh-scrim" onClick={() => setShow(false)}>
          <div role="dialog" aria-modal="true" aria-label={t("title")} className="sh-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="sh-dialog__plan">
              <Icon name="lock" size={15} />
              {t("chip")}
            </span>
            <b className="sh-dialog__title">{t("title")}</b>
            <span className="sh-dialog__text">{href ? t("text") : t("textMember")}</span>
            <div className="sh-dialog__actions">
              {href ? (
                <Link className="as-btn as-btn--primary" href={href} autoFocus onClick={() => setShow(false)}>
                  {t("go")}
                </Link>
              ) : null}
              <button type="button" className="as-textbtn" autoFocus={!href} onClick={() => setShow(false)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

/** Een menu-item of knop op slot: zelfde uitzicht, met een slotje en de uitleg "Je moet eerst de onboarding invullen." */
export function Locked({
  className,
  children,
  tip = "below",
  ...rest
}: { className: string; children: ReactNode; tip?: "below" | "end" } & Record<`data-${string}`, string>) {
  const t = useTranslations("shell.onboardingLock");
  const { open } = useOnboardingLock();
  const id = useId();
  return (
    <button type="button" className={`${className} sh-locked`} aria-disabled="true" aria-describedby={id} onClick={open} {...rest}>
      {children}
      {/* Niet in de naam van de knop; wel als beschrijving (aria-describedby). */}
      <span role="tooltip" aria-hidden="true" id={id} className={`sh-tip sh-tip--${tip}`}>
        {t("tip")}
      </span>
    </button>
  );
}
