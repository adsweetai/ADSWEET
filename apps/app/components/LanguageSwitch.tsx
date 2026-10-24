import { getLocale, getTranslations } from "next-intl/server";

const LANGS = ["nl", "fr", "en"] as const;
// In deze versie is alleen Nederlands beschikbaar. FR en EN volgen via messages/fr.json en messages/en.json.
const AVAILABLE = new Set<string>(["nl"]);

export async function LanguageSwitch() {
  const t = await getTranslations("common");
  const locale = await getLocale();
  return (
    <div role="group" aria-label={t("language")} className="au-langs">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          aria-disabled={!AVAILABLE.has(l) || undefined}
          title={AVAILABLE.has(l) ? undefined : t("languageLater")}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
