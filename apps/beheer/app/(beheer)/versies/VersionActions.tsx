"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, TextButton, useToast } from "@adsweet/ui";
import { publishAction, restoreAction } from "../actions";

export function PublishButton({ version }: { version: string }) {
  const t = useTranslations("versions");
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      arrow={false}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const v = await publishAction();
          if (v) toast.show({ message: t("published", { version: v }) });
          router.refresh();
        })
      }
    >
      {t("publish", { version })}
    </Button>
  );
}

export function RestoreButton({ version }: { version: string }) {
  const t = useTranslations("versions");
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <TextButton
      aria-label={t("restoreAria", { version })}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const concept = await restoreAction(version);
          if (concept) toast.show({ message: t("restored", { version, concept }) });
          router.refresh();
        })
      }
    >
      {t("restore")}
    </TextButton>
  );
}
