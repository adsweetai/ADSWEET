"use client";

import { useTranslations } from "next-intl";
import { DotCharacter } from "@adsweet/ui";
import { askDot } from "@/components/dot/DotLauncher";

/** Inzichten: "Stel een vraag over je cijfers" opent Dot (vanaf Pro). */
export function AskDot() {
  const t = useTranslations("insights");
  return (
    <button type="button" className="wz-dot" onClick={() => askDot("week")}>
      <DotCharacter size={26} mood="knipoog" />
      {t("ask")}
    </button>
  );
}
