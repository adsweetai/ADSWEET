import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isDemo } from "@/lib/env";
import { pendingDemoLink } from "@/lib/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("checkTitle") };
}

export default async function MailSentPage() {
  const t = await getTranslations("auth");
  const link = await pendingDemoLink();
  return (
    <>
      <h1 className="au-title">{t("checkTitle")}</h1>
      <p className="au-text">{t("checkText")}</p>
      {isDemo ? (
        link ? (
          <a href={link} className="au-link au-demo-link">
            {t("checkDemo")}
          </a>
        ) : (
          <p className="au-help">{t("checkDemoNone")}</p>
        )
      ) : null}
    </>
  );
}
