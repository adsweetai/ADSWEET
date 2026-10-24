"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Select, useToast } from "@adsweet/ui";
import { createCodeAction } from "../actions";

type Kind = "founding" | "doorverwijzing" | "partner";

/** Een nieuwe kortingscode: founding, doorverwijzing of partner. */
export function NewCode() {
  const t = useTranslations("codes");
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState({ code: "", kind: "doorverwijzing" as Kind, percent: "", months: "1", max: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const F = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="bh-section"
      aria-labelledby="new-code"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createCodeAction(f);
          if (!res.ok) return setError(t(`errors.${res.error}`));
          setError("");
          toast.show({ message: t("created", { code: f.code.trim().toUpperCase() }) });
          setF({ ...f, code: "" });
          router.refresh();
        });
      }}
    >
      <h2 id="new-code">{t("new")}</h2>
      <div className="bh-inline">
        <Input label={t("fields.code")} value={f.code} onChange={F("code")} required />
        <Select
          label={t("fields.kind")}
          value={f.kind}
          onChange={F("kind")}
          options={(["founding", "doorverwijzing", "partner"] as Kind[]).map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
        />
        <Input label={t("fields.percent")} value={f.percent} onChange={F("percent")} inputMode="numeric" />
        <Input label={t("fields.months")} value={f.months} onChange={F("months")} inputMode="numeric" />
        <Input label={t("fields.max")} value={f.max} onChange={F("max")} inputMode="numeric" />
        <Button type="submit" arrow={false} disabled={pending || !f.code.trim()}>
          {t("create")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="bh-alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
