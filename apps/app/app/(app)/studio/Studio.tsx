"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, CreditsMeter, Loading, Tag, Textarea, useToast } from "@adsweet/ui";
import { LinkButton } from "@/components/LinkButton";
import type { StudioKind, StudioVM } from "@/lib/server/studio";
import { saveImageAction, studioAction } from "./actions";

const MAKERS: (StudioKind | "video")[] = ["beeld", "tekst", "hooks", "script", "video"];
const COST: Record<StudioKind, number> = { beeld: 10, tekst: 1, hooks: 2, script: 3 };

/** Studio (App.dc.html#studio): credits bovenaan, vijf makers, het resultaat eronder. */
export function Studio({ vm }: { vm: StudioVM }) {
  const t = useTranslations("studio");
  const router = useRouter();
  const toast = useToast();
  const [left, setLeft] = useState(vm.credits.left);
  const [busy, setBusy] = useState<StudioKind | null>(null);
  const [res, setRes] = useState<{ kind: StudioKind; items: string[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();
  const out = left <= 0;

  const make = (kind: StudioKind) => {
    if (COST[kind] > left) return setMsg(t("tooFew", { cost: COST[kind], left }) + (vm.credits.trial ? ` ${t("afterTrial")}` : ""));
    setBusy(kind);
    setMsg(null);
    start(async () => {
      const r = await studioAction(kind);
      setBusy(null);
      if (!r.ok) {
        setMsg(r.error === "credits" ? t("tooFew", { cost: r.cost ?? COST[kind], left: r.left ?? 0 }) : t("error"));
        return;
      }
      setLeft(r.left);
      setRes({ kind, items: r.results });
      router.refresh();
    });
  };

  return (
    <div className="cp st">
      <CreditsMeter
        left={left}
        total={vm.credits.total}
        label={t("credits")}
        title={
          out ? t("creditsOut") : vm.credits.trial ? t("creditsTrial", { left, total: vm.credits.total }) : t("creditsMonth", { left, total: vm.credits.total })
        }
        note={t("costs")}
      />
      {out ? (
        <p className="as-small">
          {t("outNote")}{" "}
          <a className="as-link" href="/abonnement">
            {t("seeScale")}
          </a>
        </p>
      ) : null}
      <div className="st-ctx">
        <span className="as-small as-muted">{t("from")}</span>
        {vm.context.map((c) => (
          <span key={c} className="as-tag">
            {c}
          </span>
        ))}
      </div>
      <div className="st-makers">
        {MAKERS.map((k) => {
          const later = k === "video";
          return (
            <div key={k} className={["st-maker", res?.kind === k && "st-maker--on"].filter(Boolean).join(" ")}>
              <span className="st-maker__head">
                <b>{t(`makers.${k}.t`)}</b>
                <span className="as-small as-muted">{later ? <Tag>Later</Tag> : t("cost", { n: COST[k as StudioKind] })}</span>
              </span>
              <span className="as-small as-muted">{t(`makers.${k}.d`)}</span>
              <Button variant="secondary" disabled={later || out || !!busy} onClick={() => !later && make(k as StudioKind)}>
                {t(`makers.${k}.btn`)}
              </Button>
            </div>
          );
        })}
      </div>
      {busy ? <Loading>{t(`busy.${busy}`)}</Loading> : null}
      {msg ? (
        <p role="status" className="wz-note">
          {msg}
        </p>
      ) : null}
      {res && !busy ? (
        <section className="cp-section">
          <h2 className="cp-h3">{t(`resTitle.${res.kind}`)}</h2>
          <div className="st-results">
            {res.items.map((x, i) => (
              <div key={i} className="st-result">
                {res.kind === "beeld" ? <span className="st-result__img as-hatch">{x}</span> : <span className="st-result__text">{x}</span>}
                <div className="cp-actions">
                  <LinkButton href="/advertenties/maken">{t("use")}</LinkButton>
                  <Button variant="secondary" onClick={() => make(res.kind)}>
                    {t("again")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      start(async () => {
                        if (res.kind === "beeld") await saveImageAction(x);
                        toast.show({ message: res.kind === "beeld" ? t("savedImage") : t("savedText") });
                      })
                    }
                  >
                    {t("save")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <Textarea label={t("reviews")} rows={3} placeholder={t("reviewsPh")} />
      <div className="st-later">
        <span>{t("predict")}</span>
        <Tag>Later</Tag>
      </div>
    </div>
  );
}
