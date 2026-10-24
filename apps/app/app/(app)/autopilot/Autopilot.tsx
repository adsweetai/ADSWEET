"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, ChoiceCards, Icon, Switch, TextButton, useToast } from "@adsweet/ui";
import type { AutopilotVM, Limit, Mode } from "@/lib/server/autopilot";
import { limitAction, modeAction, removeRuleAction, ruleAction, templateAction } from "./actions";

const METRICS = ["kost_per_verkoop", "kost_per_aanvraag", "roas", "uitgaven_per_dag", "ctr"];
const WINDOWS = ["2_dagen", "1_dag", "3_dagen"];
const ACTIONS = ["melding", "budget", "starten", "voorstel_afzetten"];
const TEMPLATES = ["kosten", "vermoeidheid", "budget", "moment"] as const;

/** Autopilot en regels (App.dc.html#autopilot). Een advertentie afzetten kan de autopilot nooit. */
export function Autopilot({ vm, canEdit }: { vm: AutopilotVM; canEdit: boolean }) {
  const t = useTranslations("autopilot");
  const toast = useToast();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState({ metric: "kost_per_verkoop", comparator: "hoger", value: "€30", window: "2_dagen", action: "melding" });
  const D = (k: keyof typeof draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const limits: (Limit | "off")[] = ["budgetUp", "budgetDown", "extras", "off"];
  return (
    <div className="cp apl" aria-busy={pending}>
      <section className="cp-section">
        <h2 className="cp-h3">{t("title")}</h2>
        <ChoiceCards
          label={t("title")}
          value={vm.mode}
          options={(["uit", "vraag", "grenzen"] as Mode[]).map((m) => ({
            value: m,
            title: (
              <>
                {t(`modes.${m}.t`)} {m === "vraag" ? <span className="as-tag">{t("default")}</span> : null}
              </>
            ),
            sub: t(`modes.${m}.s`),
            disabled: !canEdit,
          }))}
          onChange={(m) => start(() => modeAction(m))}
        />
        {vm.mode === "grenzen" ? (
          <div className="apl-limits">
            {limits.map((k) => {
              const never = k === "off";
              return (
                <div key={k} className="apl-limit">
                  <span className="ob-stack">
                    <span>{t(`limits.${k}.t`)}</span>
                    <span className="as-small as-muted">{t(`limits.${k}.s`)}</span>
                  </span>
                  <Switch
                    label={t(`limits.${k}.t`)}
                    checked={!never && vm.limits[k as Limit]}
                    disabled={never || !canEdit}
                    onChange={(on) => !never && start(() => limitAction(k as Limit, on))}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
        <p className="as-small as-muted" style={{ margin: 0 }}>
          {t.rich("logNote", {
            log: (c) => (
              <Link href="/logboek" className="as-link">
                {c}
              </Link>
            ),
          })}
        </p>
      </section>

      <section className="cp-section">
        <h2 className="cp-h3">{t("rules")}</h2>
        <div className="apl-rules">
          {(t.raw("fixed") as string[]).map((r) => (
            <div key={r} className="apl-rule">
              <span className="apl-rule__text">
                <Icon name="lock" size={14} />
                {r}
              </span>
              <span className="as-small as-muted">{t("fixedTag")}</span>
            </div>
          ))}
          {vm.rules.map((r) => (
            <div key={r.id} className="apl-rule">
              <span>{r.text}</span>
              {canEdit ? <TextButton onClick={() => start(() => removeRuleAction(r.id))}>{t("remove")}</TextButton> : null}
            </div>
          ))}
        </div>
        {canEdit ? (
          <div className="apl-new">
            <b>{t("newRule")}</b>
            <div className="apl-builder">
              <span>{t("if")}</span>
              <select className="as-select" aria-label={t("metric")} value={draft.metric} onChange={D("metric")}>
                {METRICS.map((m) => (
                  <option key={m} value={m}>
                    {t(`metrics.${m}`)}
                  </option>
                ))}
              </select>
              <select className="as-select" aria-label={t("comparison")} value={draft.comparator} onChange={D("comparator")}>
                <option value="hoger">{t("comparators.hoger")}</option>
                <option value="lager">{t("comparators.lager")}</option>
              </select>
              <input className="as-input apl-value" aria-label={t("value")} value={draft.value} onChange={D("value")} />
              <select className="as-select" aria-label={t("window")} value={draft.window} onChange={D("window")}>
                {WINDOWS.map((w) => (
                  <option key={w} value={w}>
                    {t(`windows.${w}`)}
                  </option>
                ))}
              </select>
              <span>{t("then")}</span>
              <select className="as-select" aria-label={t("action")} value={draft.action} onChange={D("action")}>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {t(`actions.${a}`)}
                  </option>
                ))}
              </select>
            </div>
            <span className="as-small as-muted">{t("neverOff")}</span>
            <Button
              arrow={false}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await ruleAction(draft);
                  if (res.ok) toast.show({ message: t("saved") });
                })
              }
              style={{ alignSelf: "flex-start" }}
            >
              {t("save")}
            </Button>
          </div>
        ) : null}
        {canEdit ? (
          <div className="apl-templates">
            <span className="as-small as-muted">{t("templatesTitle")}</span>
            <div className="as-pills">
              {TEMPLATES.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="as-pill"
                  onClick={() =>
                    start(async () => {
                      await templateAction(k);
                      toast.show({ message: t("templateAdded") });
                    })
                  }
                >
                  {t(`templates.${k}.t`)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
