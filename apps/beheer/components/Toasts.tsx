"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ToastProvider } from "@adsweet/ui";

export function Toasts({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <ToastProvider undoLabel={t("undo")} closeLabel={t("close")}>
      {children}
    </ToastProvider>
  );
}
