"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@adsweet/ui";

interface GateRequest {
  plan: string;
  title?: string;
  text: string;
}

const Ctx = createContext<(r: GateRequest) => void>(() => {});

/** Opent het sobere paneel "Dit zit in Pro." voor een knop buiten het plan. */
export const useGate = () => useContext(Ctx);

export function GateProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("shell.gate");
  const tu = useTranslations("ui");
  const [gate, setGate] = useState<GateRequest | null>(null);
  const open = useCallback((r: GateRequest) => setGate(r), []);
  useEffect(() => {
    if (!gate) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setGate(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [gate]);
  const title = gate?.title ?? (gate ? tu("gateTitle", { plan: gate.plan }) : "");
  return (
    <Ctx.Provider value={open}>
      {children}
      {gate ? (
        <div className="sh-scrim" onClick={() => setGate(null)}>
          <div role="dialog" aria-modal="true" aria-label={title} className="sh-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="sh-dialog__plan">
              <Icon name="lock" size={15} />
              {gate.plan}
            </span>
            <b className="sh-dialog__title">{title}</b>
            <span className="sh-dialog__text">{gate.text}</span>
            <div className="sh-dialog__actions">
              <Link className="as-btn as-btn--primary" href="/abonnement" autoFocus>
                {t("plans")}
              </Link>
              <button type="button" className="as-textbtn" onClick={() => setGate(null)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
