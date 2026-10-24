import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Logo } from "@adsweet/ui";
import { isDemo } from "@/lib/env";
import { MAIL_COOKIE } from "@/lib/server/auth";
import { LoginForm } from "./LoginForm";

export async function generateMetadata() {
  const t = await getTranslations("login");
  return { title: t("metaTitle") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verstuurd?: string; fout?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("login");
  const tc = await getTranslations("common");
  const demoLink = isDemo ? (await cookies()).get(MAIL_COOKIE)?.value : undefined;
  return (
    <main className="bh-login">
      <div className="bh-login__card">
        <span className="bh-brand" style={{ padding: 0 }}>
          <Logo alt={tc("logoAlt")} />
          <span className="bh-tag">{tc("tag")}</span>
        </span>
        {sp.verstuurd ? (
          <>
            <h1>{t("sentTitle")}</h1>
            <p>{t("sentText")}</p>
            {demoLink ? (
              <Link href={demoLink} className="as-btn as-btn--primary">
                {t("demoLink")}
              </Link>
            ) : null}
            <Link href="/inloggen" className="as-textbtn">
              {t("again")}
            </Link>
          </>
        ) : (
          <>
            <h1>{t("title")}</h1>
            <p>{t("text")}</p>
            {sp.fout ? (
              <p role="alert" className="bh-alert">
                {t("linkError")}
              </p>
            ) : null}
            <LoginForm />
          </>
        )}
      </div>
    </main>
  );
}
