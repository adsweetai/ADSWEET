import { getTranslations } from "next-intl/server";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import "./start.css";

export default async function StartPage() {
  const t = await getTranslations("start");
  return (
    <main className="start">
      <span className="start-logo">
        <img className="start-logo-light" src="/adsweet-logo.svg" alt="adsweet" height={19} />
        <img
          className="start-logo-dark"
          src="/adsweet-logo-licht.svg"
          alt=""
          aria-hidden="true"
          height={19}
        />
      </span>
      <p className="start-eyebrow">{t("eyebrow")}</p>
      <h1 className="start-title">
        {t("title")}
        <span>{t("accent")}</span>
      </h1>
      <p className="start-text">{t("text")}</p>
      <ThemeSwitch />
    </main>
  );
}
