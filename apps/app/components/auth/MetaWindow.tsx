"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button, Loader } from "@adsweet/ui";
import "./meta-window.css";

export type MetaOutcome = "ok" | "ok_bestaand" | "perm" | "noacc" | "expired";

/**
 * Het venster van Meta: we bootsen het niet na. Een neutrale tussenpagina met drie stappen in tekst, terwijl Meta
 * zijn eigen venster opent. In de demo kies je wat Meta teruggeeft.
 */
export function MetaWindow({
  demo,
  existingOption,
  onOutcome,
  onClose,
  realHref,
}: {
  demo: boolean;
  existingOption?: boolean;
  onOutcome: (o: MetaOutcome) => void;
  onClose: () => void;
  /** Buiten de demo: waar het echte venster van Meta begint (Supabase Auth met Facebook). */
  realHref?: string | null;
}) {
  const t = useTranslations("metaWindow");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    if (!demo && realHref) {
      const timer = window.setTimeout(() => window.location.assign(realHref), 900);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("keydown", onKey);
      };
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [demo, realHref, onClose]);
  const outcomes: MetaOutcome[] = existingOption ? ["ok", "ok_bestaand", "perm", "noacc", "expired"] : ["ok", "perm", "noacc", "expired"];
  return (
    <div className="mw-scrim">
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="meta-title" className="mw">
        <h1 id="meta-title" className="mw-title">
          {t("title")}
        </h1>
        <p className="as-muted">{t("text")}</p>
        <ol className="mw-steps">
          {(t.raw("steps") as string[]).map((s, i) => (
            <li key={s}>
              <span>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div role="status" className="mw-wait">
          <Loader />
          <span>{t("waiting")}</span>
        </div>
        {demo ? (
          <div className="mw-demo">
            <span>{t("demo")}</span>
            <div className="cp-actions">
              {outcomes.map((o) => (
                <button key={o} type="button" className="cp-demo" onClick={() => onOutcome(o)}>
                  {t(`outcomes.${o}`)}
                </button>
              ))}
            </div>
          </div>
        ) : !realHref ? (
          <div className="mw-demo">
            <span>{t("notYet")}</span>
            <Button variant="secondary" onClick={onClose}>
              {t("close")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
