"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@adsweet/ui";
import { FacebookButton } from "./FacebookButton";

/** Fout na het venster van Meta: geen toestemming, geen advertentieaccount of een verlopen koppeling. */
export function AuthError({ error, context, demo }: { error: "perm" | "noacc" | "expired"; context: "signup" | "login"; demo: boolean }) {
  const t = useTranslations("metaWindow");
  return (
    <>
      <StatusBadge kind="act" size="sm">
        {t("actie")}
      </StatusBadge>
      <h1 className="au-title au-title--sm">{t(`errors.${error}`)}</h1>
      <div className="au-row">
        <FacebookButton context={context} demo={demo} next={context === "signup" ? "/onboarding/start" : "/vandaag"} className="au-btn au-btn--auto" />
        {error === "noacc" ? (
          <Link className="au-link" href="/academy">
            {t("howMake")}
          </Link>
        ) : null}
      </div>
      <span className="au-small">{error === "expired" ? t("relinkNote") : t("retryNote")}</span>
    </>
  );
}
