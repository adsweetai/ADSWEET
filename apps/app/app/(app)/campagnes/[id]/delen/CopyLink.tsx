"use client";

import { useTranslations } from "next-intl";
import { Button, useToast } from "@adsweet/ui";

export function CopyLink({ url }: { url: string }) {
  const t = useTranslations("previewLink");
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      icon="link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Zonder toestemming voor het klembord staat de link ernaast om te selecteren.
        }
        toast.show({ message: t("copied") });
      }}
    >
      {t("copy")}
    </Button>
  );
}
