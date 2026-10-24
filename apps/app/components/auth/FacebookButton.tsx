"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { demoFacebookAction, inviteFacebookAction } from "@/app/(auth)/actions";
import { MetaWindow, type MetaOutcome } from "./MetaWindow";

/** "Doorgaan met Facebook": opent eerst de neutrale tussenpagina, daarna het venster van Meta. */
export function FacebookButton({
  context,
  demo,
  next,
  token,
  disabled,
  className = "au-btn",
}: {
  context: "signup" | "login" | "invite";
  demo: boolean;
  next: string;
  token?: string;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const onOutcome = (o: MetaOutcome) =>
    start(async () => {
      if (context === "invite" && token) await inviteFacebookAction(token, o);
      else await demoFacebookAction(context === "signup" ? "signup" : "login", o);
    });
  return (
    <>
      <button type="button" className={className} disabled={disabled || pending} aria-disabled={disabled || undefined} onClick={() => setOpen(true)}>
        {t("fb")}
      </button>
      {open ? (
        <MetaWindow
          demo={demo}
          onOutcome={onOutcome}
          onClose={() => setOpen(false)}
          realHref={demo ? null : `/auth/facebook?next=${encodeURIComponent(next)}`}
        />
      ) : null}
    </>
  );
}
