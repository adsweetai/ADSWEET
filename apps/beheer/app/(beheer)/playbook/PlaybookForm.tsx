"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, useToast } from "@adsweet/ui";
import { Head, Table } from "@/components/Head";
import { FIELDS, type FormError, type Group } from "@/lib/playbook";
import { saveConceptAction } from "../actions";

const GROUPS: Group[] = ["start", "budget", "scale"];

export function PlaybookForm({
  initial,
  note: initialNote,
  version,
  isNew,
  published,
}: {
  initial: Record<string, string>;
  note: string;
  version: string;
  isNew: boolean;
  published: string | null;
}) {
  const t = useTranslations("playbook");
  const tn = useTranslations("nav");
  const ti = useTranslations("intro");
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [note, setNote] = useState(initialNote);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [pending, start] = useTransition();
  const errorOf = (key: string) => errors.find((e) => e.key === key);
  const message = (e: FormError) => {
    if (e.kind === "range") {
      const f = FIELDS.find((x) => x.key === e.key)!;
      return t("errors.range", { min: f.min, max: f.max });
    }
    return t(`errors.${e.kind}`);
  };
  const save = () =>
    start(async () => {
      const res = await saveConceptAction(form, note);
      if (!res.ok) {
        setErrors(res.errors);
        return;
      }
      setErrors([]);
      toast.show({ message: t("saved", { version: res.version }) });
      router.refresh();
    });

  return (
    <form
      className="bh-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Head title={tn("playbook")} intro={`${ti("playbook")} ${isNew && published ? t("editingNew", { version, published }) : t("editing", { version })}`}>
        <Button type="submit" arrow={false} disabled={pending}>
          {t("save")}
        </Button>
      </Head>
      {errors.length ? (
        <p role="alert" className="bh-alert">
          {t("errors.summary")}
        </p>
      ) : null}
      {GROUPS.map((g) => (
        <section key={g} className="bh-section">
          <h2>{t(`groups.${g}`)}</h2>
          <Table cols={t.raw("cols") as string[]}>
            {FIELDS.filter((f) => f.group === g).map((f) => {
              const [label, help] = t.raw(`fields.${f.key}`) as [string, string];
              const err = errorOf(f.key);
              return (
                <tr key={f.key}>
                  <td>{label}</td>
                  <td>
                    <input
                      className="bh-input"
                      inputMode="decimal"
                      value={form[f.key]}
                      aria-label={t("fieldAria", { label })}
                      aria-invalid={err ? true : undefined}
                      onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))}
                    />
                    {err ? <span className="bh-err">{message(err)}</span> : null}
                  </td>
                  <td className={/^\[/.test(help) ? "bh-ph" : undefined}>{help}</td>
                </tr>
              );
            })}
          </Table>
        </section>
      ))}
      <section className="bh-section">
        <h2>{t("groups.warnings")}</h2>
        <p className="bh-note">{t("warningsNote")}</p>
      </section>
      <section className="bh-section">
        <h2>{t("groups.google")}</h2>
        <p className="bh-note">{t("googleNote")}</p>
      </section>
      <div className="bh-inline">
        <Input label={t("note")} value={note} placeholder={t("notePh")} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit" arrow={false} disabled={pending}>
          {t("save")}
        </Button>
      </div>
      <p className="as-muted" style={{ margin: 0 }}>
        <Link href="/versies" className="as-link">
          {t("toPublish")}
        </Link>
      </p>
    </form>
  );
}
