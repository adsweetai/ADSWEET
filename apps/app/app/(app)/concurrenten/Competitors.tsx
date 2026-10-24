"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Avatar, Button, Input, PhasePill, useToast, type Phase } from "@adsweet/ui";
import { LinkButton } from "@/components/LinkButton";
import { ExampleTag } from "@/components/ui";
import type { CompetitorsVM } from "@/lib/server/competitors";
import { competitorAction } from "../studio/actions";

/** Concurrenten (App.dc.html#concurrenten): wat anderen adverteren, wat opvalt, en per fase de boodschap die past. */
export function Competitors({ vm, canEdit }: { vm: CompetitorsVM; canEdit: boolean }) {
  const t = useTranslations("competitors");
  const toast = useToast();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const rows = t.raw("rows") as string[];
  const tags = t.raw("inspiration") as string[][];
  return (
    <div className="cp co">
      {canEdit ? (
        <form
          className="co-add"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await competitorAction(name);
              if (res.ok) {
                setName("");
                toast.show({ message: t("added") });
              }
            });
          }}
        >
          <Input label={t("addLabel")} placeholder={t("addPh")} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" arrow={false} disabled={pending || !name.trim()}>
            {t("add")}
          </Button>
        </form>
      ) : null}
      <span className="as-small as-muted">
        {t("source")} {vm.example ? <ExampleTag /> : null}
      </span>
      <div className="co-list">
        {vm.names.map((n) => (
          <article key={n} className="co-card">
            <b>{n}</b>
            <dl>
              {rows.map((r, i) => (
                <div key={r}>
                  <dt>{r}</dt>
                  <dd className="as-muted">{(t.raw("placeholders") as string[])[i]}</dd>
                </div>
              ))}
            </dl>
            <div className="co-frames">
              {[0, 1, 2].map((i) => (
                <span key={i} className="as-hatch" aria-hidden="true" />
              ))}
            </div>
          </article>
        ))}
      </div>
      <section className="cp-section">
        <h2 className="cp-h3">{t("notesTitle")}</h2>
        {(vm.notes ?? [t("notesLater")]).map((n) => (
          <p key={n} className="co-note">
            {n}
          </p>
        ))}
        <div className="cp-actions">
          <LinkButton href="/studio">{t("own")}</LinkButton>
          <span className="as-small as-muted">{t("noCopy")}</span>
        </div>
      </section>
      <section className="cp-section">
        <h2 className="cp-h3">{t("strategist")}</h2>
        {vm.personas ? (
          <div className="co-personas">
            {vm.personas.map((p) => (
              <article key={p.name} className="co-persona">
                <span className="ob-row">
                  <Avatar initial={p.initial} color={p.color} size={28} />
                  <b>{p.name}</b>
                </span>
                <span className="as-small as-muted">{p.text}</span>
                {p.phases.map(([phase, msg, hook]) => (
                  <div key={phase} className="co-phase">
                    <PhasePill phase={phase as Phase} size="sm" />
                    <span>{msg}</span>
                    <span className="as-small as-muted">{t("hook", { h: hook })}</span>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : (
          <p className="as-muted">{t("strategistLater")}</p>
        )}
      </section>
      <section className="cp-section">
        <h2 className="cp-h3">{t("inspirationTitle")}</h2>
        <div className="co-insp">
          {tags.map((tg, i) => (
            <figure key={i} className="co-insp__item">
              <span className="as-hatch" aria-hidden="true" />
              <figcaption>
                {tg.map((x) => (
                  <span key={x} className="as-tag">
                    {x}
                  </span>
                ))}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
