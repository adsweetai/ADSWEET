import { getTranslations } from "next-intl/server";
import { Logo, Sculpture } from "@adsweet/ui";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import "@/app/(auth)/auth.css";

/** Twee kolommen: links de stilstaande sculptuur, rechts het formulier. Op de gsm alleen het formulier. */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  const slogan = t.rich("slogan", { sweet: (chunks) => <span>{chunks}</span> });
  return (
    <div className="au">
      <aside className="au-aside">
        <a href="https://adsweet.ai" aria-label={t("toWebsite")} className="au-logo">
          <Logo height={19} />
        </a>
        <Sculpture />
        <span className="au-slogan">{slogan}</span>
      </aside>
      <div className="au-main">
        <div className="au-top">
          <a href="https://adsweet.ai" aria-label={t("toWebsite")} className="au-logo">
            <Logo height={17} />
          </a>
          <Sculpture />
        </div>
        <div className="au-center">
          <div className="au-box">{children}</div>
        </div>
        <div className="au-foot">
          <LanguageSwitch />
          <a href="https://adsweet.ai/privacy">{t("privacy")}</a>
        </div>
      </div>
    </div>
  );
}
