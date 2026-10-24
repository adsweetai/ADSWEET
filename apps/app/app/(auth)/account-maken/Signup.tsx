"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { FacebookButton } from "@/components/auth/FacebookButton";

/** Account maken (Inloggen.dc.html#account-maken): de knop wordt pas actief na akkoord met de voorwaarden. */
export function Signup({ chip, demo }: { chip: string | null; demo: boolean }) {
  const t = useTranslations("auth");
  const [terms, setTerms] = useState(false);
  return (
    <>
      <h1 className="au-title">{t("signupTitle")}</h1>
      {chip ? <span className="au-chip">{chip}</span> : null}
      <FacebookButton context="signup" demo={demo} next="/onboarding/start" disabled={!terms} />
      <p className="au-text">{t("signupNote")}</p>
      <label className="au-check">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span>
          {t.rich("terms", {
            terms: (c) => (
              <a className="au-link" href="https://adsweet.ai/voorwaarden">
                {c}
              </a>
            ),
            privacy: (c) => (
              <a className="au-link" href="https://adsweet.ai/privacy">
                {c}
              </a>
            ),
          })}
        </span>
      </label>
      <span className="au-small">
        {t("haveAccount")}{" "}
        <Link className="au-link" href="/inloggen">
          {t("loginLink")}
        </Link>
      </span>
    </>
  );
}
