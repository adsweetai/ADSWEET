"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Plan, SubscriptionStatus } from "@adsweet/db";
import { Button, Input, TextButton, formatDayMonth, useToast } from "@adsweet/ui";
import { PLAN_NAME, PLAN_ORDER } from "@/lib/plans";
import type { SubscriptionVM } from "@/lib/server/subscription";
import { billingPeriodAction, cancelAction, changePlanAction, demoSubStateAction, resumeAction, saveBillingAction } from "./actions";

const STATES: SubscriptionStatus[] = ["proef", "actief", "mislukt", "opgezegd", "verlopen"];

/** Abonnement en facturen (App.dc.html#abonnement). */
export function Subscription({ vm }: { vm: SubscriptionVM }) {
  const t = useTranslations("subscription");
  const toast = useToast();
  const router = useRouter();
  const [compare, setCompare] = useState(vm.state === "verlopen");
  const [pick, setPick] = useState<Plan>(vm.plan);
  const [billing, setBilling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  if (vm.mode === "client") return <p className="st-note">{t("agencyClient", { client: vm.orgName, agency: vm.agency ?? "" })}</p>;
  if (vm.mode === "notOwner") return <p className="st-note">{t("ownerOnly")}</p>;

  const up = PLAN_ORDER.indexOf(pick) > PLAN_ORDER.indexOf(vm.plan);
  const pickPrice = vm.plans.find((p) => p.id === pick)?.price ?? "";
  const compareText =
    pick === vm.plan
      ? t("choose")
      : pick === "agency"
        ? t("agencyTalk")
        : `${vm.founding ? t("newAmountFounding", { price: pickPrice }) : t("newAmount", { price: pickPrice })} ${up ? t("upNow") : t("downLater")}`;

  return (
    <>
      {vm.demo ? (
        <div role="group" aria-label={t("demoAria")} className="sb-demo">
          {STATES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={vm.state === s}
              disabled={pending || (s === "proef" && !vm.canTrial)}
              onClick={() => run(() => demoSubStateAction(s))}
            >
              {t(`states.${s}`)}
            </button>
          ))}
        </div>
      ) : null}

      {vm.state === "verlopen" ? <p className="st-alert">{t("expired")}</p> : null}

      <div className="sb-facts">
        {vm.facts.map((f) => (
          <div key={f.k} className={f.act ? "sb-fact sb-fact--act" : "sb-fact"}>
            <span className="sb-fact__k">{f.k}</span>
            <b>{f.v}</b>
            {f.s ? <span className="sb-fact__s">{f.s}</span> : null}
          </div>
        ))}
      </div>
      {vm.scheduled ? (
        <p className="st-note" role="status">
          {vm.scheduled.text}
        </p>
      ) : null}

      <div className="st-actions">
        <Button arrow={false} aria-expanded={compare} onClick={() => setCompare(!compare)}>
          {t("change")}
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await billingPeriodAction(vm.yearlyAction);
              if (vm.yearlyAction !== "undo") toast.show({ message: vm.yearlyAction === "yearly" ? t("yearlyDone") : t("monthlyDone") });
            })
          }
        >
          {vm.yearlyAction === "yearly" ? t("yearly") : vm.yearlyAction === "monthly" ? t("monthly") : t("undoScheduled")}
        </Button>
        <Button variant="secondary" aria-expanded={billing} onClick={() => setBilling(!billing)}>
          {t("billing")}
        </Button>
      </div>

      {compare ? (
        <>
          <div role="radiogroup" aria-label={t("compareAria")} className="sb-plans">
            {vm.plans.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={pick === p.id} className="sb-plan" onClick={() => setPick(p.id)}>
                <span className="sb-plan__head">
                  <b>{PLAN_NAME[p.id]}</b>
                  <span className="as-small as-muted">{p.current ? t("current") : ""}</span>
                </span>
                <span className="sb-plan__price">{p.price}</span>
                <span className="as-small as-muted">{t(`plansWhat.${p.id}`)}</span>
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14 }}>{compareText}</p>
          {pick !== vm.plan && pick !== "agency" ? (
            <div className="st-actions">
              <Button
                arrow={false}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await changePlanAction(pick);
                    if (!res.ok) {
                      if (res.error === "accounts") setError(t("tooMany", { n: res.n ?? 0, plan: PLAN_NAME[pick], max: res.max ?? 0 }));
                      else if (res.error === "users") setError(t("tooManyUsers", { n: res.n ?? 0, plan: PLAN_NAME[pick], max: res.max ?? 0 }));
                      return;
                    }
                    setError("");
                    setCompare(false);
                    toast.show({
                      message:
                        res.when === "now"
                          ? t("changedUp", { plan: PLAN_NAME[pick] })
                          : res.date
                            ? t("changedDown", { plan: PLAN_NAME[pick], date: formatDayMonth(res.date) })
                            : t("changedDownNext", { plan: PLAN_NAME[pick] }),
                    });
                    router.refresh();
                  })
                }
              >
                {t("confirm", { plan: PLAN_NAME[pick] })}
              </Button>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="st-alert">
              {error}
            </p>
          ) : null}
        </>
      ) : null}

      {billing ? <BillingForm initial={vm.billing} /> : null}

      <section className="sb-section">
        <h3 className="sb-h3">{t("invoices")}</h3>
        {vm.invoices.length === 0 ? <p className="sb-empty">{vm.noInvoices}</p> : null}
        {vm.invoices.map((i) => (
          <div key={i.id} className="sb-inv">
            <span>{i.date}</span>
            <span>{i.amount}</span>
            <span className="as-muted">{i.vat}</span>
            <span className={`sb-inv--${i.status}`}>{t(`invoiceStatus.${i.status}`)}</span>
            {i.pdf ? (
              <a className="as-textbtn" href={`/api/invoices/${i.id}`} aria-label={t("pdfAria", { number: i.number })}>
                {t("pdf")}
              </a>
            ) : (
              <span />
            )}
          </div>
        ))}
      </section>

      <section className="sb-cancel">
        <h3 className="sb-h3">{t("cancelTitle")}</h3>
        {vm.state === "opgezegd" ? (
          <>
            <p>{t("cancelled", { date: vm.periodEnd })}</p>
            <TextButton
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await resumeAction();
                  toast.show({ message: t("resumed") });
                })
              }
            >
              {t("resume")}
            </TextButton>
          </>
        ) : vm.state === "verlopen" ? null : !cancelling ? (
          <div>
            <TextButton onClick={() => setCancelling(true)}>{t("cancelStart")}</TextButton>
          </div>
        ) : (
          <>
            <fieldset>
              <legend>{t("cancelLegend")}</legend>
              {(t.raw("reasons") as string[]).map((r) => (
                <label key={r}>
                  <input type="radio" name="reden" checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </fieldset>
            <p>{t("cancelText", { date: vm.periodEnd })}</p>
            {vm.founding ? <p style={{ fontWeight: 500 }}>{t("cancelFounding")}</p> : null}
            <div className="st-actions">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await cancelAction(reason);
                    setCancelling(false);
                    toast.show({
                      message: t("cancelDone", { date: res.until }),
                      undo: () => run(() => resumeAction()),
                    });
                    router.refresh();
                  })
                }
              >
                {t("cancelConfirm")}
              </Button>
              <Button arrow={false} onClick={() => setCancelling(false)}>
                {t("stay")}
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function BillingForm({ initial }: { initial: SubscriptionVM["billing"] }) {
  const t = useTranslations("subscription");
  const ts = useTranslations("settings");
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const F = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="st-form"
      aria-label={t("billingTitle")}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveBillingAction(f);
          if (!res.ok) return setError(t("billingErrEmail"));
          setError("");
          toast.show({ message: t("billingSaved") });
        });
      }}
    >
      <h3 className="sb-h3">{t("billingTitle")}</h3>
      <div className="st-grid">
        <Input label={t("billingFields.name")} value={f.name} onChange={F("name")} />
        <Input label={t("billingFields.vat")} value={f.vat} onChange={F("vat")} />
        <Input label={t("billingFields.address")} value={f.address} onChange={F("address")} className="st-span" />
        <Input label={t("billingFields.email")} type="email" value={f.email} onChange={F("email")} />
      </div>
      <p className="st-note">{t("billingNote")}</p>
      {error ? (
        <p role="alert" className="st-alert">
          {error}
        </p>
      ) : null}
      <div className="st-actions">
        <Button type="submit" arrow={false} disabled={pending}>
          {ts("save")}
        </Button>
      </div>
    </form>
  );
}
