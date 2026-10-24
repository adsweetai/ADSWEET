"use client";

import { useTranslations } from "next-intl";
import { Button } from "@adsweet/ui";

/** Exporteer als PDF: de printversie van de browser (met de printstijl van de app). */
export function ReportActions() {
  const t = useTranslations("insights");
  return (
    <Button variant="secondary" icon="file" onClick={() => window.print()} style={{ alignSelf: "flex-start" }}>
      {t("pdf")}
    </Button>
  );
}
