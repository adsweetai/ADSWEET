"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@adsweet/ui";
import { waitlistAction, type WaitlistState } from "@/app/(auth)/actions";

/** Testfase (Inloggen.dc.html#testfase): nieuwe bedrijven in kleine groepen, met een wachtlijst. */
export function Testfase({ showLogin }: { showLogin?: boolean }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<WaitlistState, FormData>(waitlistAction, {});
  return (
    <>
      <h1 className="au-title">{t("testTitle")}</h1>
      <p className="au-text">{t("testText")}</p>
      {state.ok ? (
        <p role="status" className="au-status">
          <Icon name="ok" size={16} />
          {t("testOk")}
        </p>
      ) : (
        <form action={action} className="au-form">
          <label className="au-field">
            <span>{t("name")}</span>
            <input name="name" required type="text" autoComplete="name" />
          </label>
          <label className="au-field">
            <span>{t("mailLabel")}</span>
            <input name="email" required type="email" autoComplete="email" />
          </label>
          <label className="au-field">
            <span>{t("site")}</span>
            <input name="website" type="text" placeholder="jouwzaak.be" />
          </label>
          {state.error ? (
            <span className="au-error" role="alert">
              {t("testError")}
            </span>
          ) : null}
          <button type="submit" className="au-btn" disabled={pending}>
            {t("testBtn")}
          </button>
        </form>
      )}
      {showLogin ? (
        <span className="au-small">
          {t("invited")}{" "}
          <Link href="/inloggen?mail=1" className="au-link">
            {t("mailBtn")}
          </Link>
        </span>
      ) : null}
    </>
  );
}
