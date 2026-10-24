"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TextButton, useToast } from "@adsweet/ui";
import { approvePartnerAction } from "../actions";

export function ApprovePartner({ id }: { id: string }) {
  const t = useTranslations("partners");
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <TextButton
      disabled={pending}
      onClick={() =>
        start(async () => {
          await approvePartnerAction(id);
          toast.show({ message: t("approved") });
          router.refresh();
        })
      }
    >
      {t("approve")}
    </TextButton>
  );
}
