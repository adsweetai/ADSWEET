"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TextButton, useToast } from "@adsweet/ui";
import { callDoneAction, planCallAction } from "../actions";

/** Een moment kiezen (Belgische tijd) of de call afvinken. */
export function CallActions({ id, client, status }: { id: string; client: string; status: "te_plannen" | "gepland" }) {
  const t = useTranslations("calls");
  const toast = useToast();
  const router = useRouter();
  const [when, setWhen] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="bh-rowform">
      <input type="datetime-local" aria-label={t("planLabel", { client })} value={when} onChange={(e) => setWhen(e.target.value)} />
      <TextButton
        disabled={pending || !when}
        onClick={() =>
          start(async () => {
            const ok = await planCallAction(id, when);
            toast.show({ message: ok ? t("planned", { client }) : t("planError") });
            router.refresh();
          })
        }
      >
        {t("plan")}
      </TextButton>
      {status === "gepland" ? (
        <TextButton
          disabled={pending}
          onClick={() =>
            start(async () => {
              await callDoneAction(id);
              toast.show({ message: t("doneToast") });
              router.refresh();
            })
          }
        >
          {t("done")}
        </TextButton>
      ) : null}
    </span>
  );
}
