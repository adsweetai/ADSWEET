"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@adsweet/ui";
import { sendLinkAction } from "./actions";

export function LoginForm() {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState(sendLinkAction, { error: false });
  return (
    <form action={action}>
      <Input label={t("email")} name="email" type="email" autoComplete="email" required error={state.error ? t("invalid") : undefined} />
      <Button type="submit" disabled={pending}>
        {t("send")}
      </Button>
    </form>
  );
}
