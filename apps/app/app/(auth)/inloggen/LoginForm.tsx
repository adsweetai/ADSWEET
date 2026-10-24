"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { requestLoginLink, type LoginState } from "./actions";

export function LoginForm({
  next,
  linkInvalid,
  demoEmails,
}: {
  next?: string;
  linkInvalid?: boolean;
  demoEmails: string[];
}) {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(linkInvalid ?? false);
  const [fbNote, setFbNote] = useState(false);
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<LoginState, FormData>(requestLoginLink, {});
  const error =
    state.error === "ongeldig" ? t("mailInvalid") : state.error === "fout" ? t("mailError") : null;

  return (
    <>
      <h1 className="au-title">{t("loginTitle")}</h1>
      <button
        type="button"
        className="au-btn"
        onClick={() => {
          setFbNote(true);
          setOpen(true);
        }}
      >
        {t("fb")}
      </button>
      {fbNote ? (
        <p className="au-note" role="status">
          {t("fbLater")}
        </p>
      ) : null}
      {linkInvalid ? (
        <p className="au-error" role="alert">
          {t("linkInvalid")}
        </p>
      ) : null}
      {!open ? (
        <button type="button" className="au-textbtn" onClick={() => setOpen(true)}>
          {t("mailBtn")}
        </button>
      ) : (
        <form action={action} className="au-form" noValidate>
          <input type="hidden" name="next" value={next ?? ""} />
          <label className="au-field">
            <span>{t("mailLabel")}</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder={t("mailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>
          {error ? (
            <span id="login-error" className="au-error" role="alert">
              {error}
            </span>
          ) : null}
          <button type="submit" className="au-secondary" disabled={pending}>
            {t("mailSend")}
          </button>
          <span className="au-help">{t("mailNote")}</span>
        </form>
      )}
      {demoEmails.length ? (
        <div className="au-demo">
          <strong>{t("demoAccounts")}</strong>
          <ul>
            {demoEmails.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(true);
                    setEmail(m);
                  }}
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
          <span>{t("demoAccountsNote")}</span>
        </div>
      ) : null}
      <span className="au-small">
        {t("newHere")} <a href="/account-maken">{t("signupLink")}</a>
      </span>
    </>
  );
}
