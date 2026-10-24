"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Icon, Input, Loader, Pills, formatEuro } from "@adsweet/ui";
import { codeAction, finishAction, liveAction, trialAction } from "../actions";
import { StepFooter, useStepNav, useVM } from "../shared";

type PlanId = "starter" | "pro" | "scale";
export type Prices = Record<PlanId, { month: number; yearMonth: number; year: number }>;
const VAT = 0.21;

// ---------------------------------------------------------------------------
// Stap 10 · Je plan en je proefperiode
// ---------------------------------------------------------------------------

export function StepPlan({ prices }: { prices: Prices }) {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const router = useRouter();
  const [period, setPeriod] = useState(vm.billing.period);
  const [plan, setPlan] = useState<PlanId>(vm.billing.plan === "agency" ? "scale" : vm.billing.plan);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ percent: number; kind: string } | null>(null);
  const [billing, setBilling] = useState({ name: vm.billing.name, vat: vm.billing.vat, address: vm.billing.address, email: vm.billing.email });
  const [paying, setPaying] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (code.trim().length < 4) {
      setDiscount(null);
      return;
    }
    const timer = window.setTimeout(() => codeAction(code).then((r) => setDiscount(r ? { percent: r.percent, kind: r.kind } : null)), 350);
    return () => window.clearTimeout(timer);
  }, [code]);

  const yearly = period === "jaarlijks";
  const vat = billing.vat.replace(/\s/g, "").toUpperCase();
  const reverse = /^[A-Z]{2}/.test(vat) && !vat.startsWith("BE") && vat.length > 6;
  const base = yearly ? prices[plan].year : Math.round(prices[plan].month * (1 - (discount?.percent ?? 0) / 100) * 100) / 100;
  const vatAmt = Math.round(base * VAT * 100) / 100;
  const per = yearly ? t("perY") : t("perM");
  const p = formatEuro(base, 2).replace(",00", "");
  const summary = reverse
    ? t("summaryRev", { d: vm.trialEnd, p, per })
    : t("summary", { d: vm.trialEnd, p, v: formatEuro(vatAmt, 2), t: formatEuro(base + vatAmt, 2), per });
  const what = t.raw("planWhat") as string[];
  const names: Record<PlanId, string> = { starter: "Starter", pro: "Pro", scale: "Scale" };

  const pay = () =>
    start(async () => {
      const res = await trialAction({ plan, period, code, billing });
      if (res.ok) {
        setPaying(false);
        router.refresh();
      }
    });

  return (
    <>
      <h1 className="ob-h1">{t("planTitle")}</h1>
      <Pills
        label={t("period")}
        value={period}
        options={[
          { value: "maandelijks", label: t("monthly") },
          { value: "jaarlijks", label: t("yearly") },
        ]}
        onChange={setPeriod}
      />
      <div role="radiogroup" aria-label={t("planLabel")} className="ob-plans">
        {(["starter", "pro", "scale"] as PlanId[]).map((id, i) => (
          <button key={id} type="button" role="radio" aria-checked={plan === id} className="ob-plan" onClick={() => setPlan(id)}>
            <span className="ob-row">
              <b>{names[id]}</b>
              {id === "pro" ? <span className="as-tag">{t("rec")}</span> : null}
            </span>
            <span className="ob-plan__price">{formatEuro(yearly ? prices[id].yearMonth : prices[id].month)}</span>
            <span className="as-small as-muted">{t("perMonth")}</span>
            <span className="as-small">{what[i]}</span>
          </button>
        ))}
      </div>
      <a className="as-link ob-self" href="https://adsweet.ai/gesprek">
        {t("agency")}
      </a>
      <div className="ob-grid">
        <Input
          label={t("code")}
          value={code}
          placeholder="[founding-code]"
          onChange={(e) => setCode(e.target.value)}
          help={discount?.kind === "founding" ? t("codeOk") : discount ? t("codeOther", { p: discount.percent }) : undefined}
        />
      </div>
      <div role="status" className="ob-calc">
        <span>{summary}</span>
        {yearly && discount ? <span className="as-small as-muted">[founding en jaarplan]</span> : null}
        {reverse ? <span className="as-small">{t("reverse")}</span> : null}
      </div>
      <section className="ob-group">
        <h2 className="ob-h2">{t("billing")}</h2>
        <div className="ob-grid">
          <Input label={t("company")} value={billing.name} onChange={(e) => setBilling((b) => ({ ...b, name: e.target.value }))} />
          <Input label={t("vat")} placeholder="BE0123456789" value={billing.vat} onChange={(e) => setBilling((b) => ({ ...b, vat: e.target.value }))} />
          <Input label={t("address")} placeholder="[adres]" value={billing.address} onChange={(e) => setBilling((b) => ({ ...b, address: e.target.value }))} />
          <Input
            label={t("invoiceMail")}
            type="email"
            placeholder="facturen@jouwzaak.be"
            value={billing.email}
            onChange={(e) => setBilling((b) => ({ ...b, email: e.target.value }))}
          />
        </div>
        <span className="as-small as-muted">{t("peppol")}</span>
      </section>
      {vm.billing.paid ? (
        <p role="status" className="ob-done">
          <Icon name="ok" size={16} />
          {t("trialOn")}
        </p>
      ) : null}
      <StepFooter
        prev={nav.prev}
        pending={nav.pending || pending}
        label={vm.billing.paid ? t("next") : t("pay")}
        onNext={() => (vm.billing.paid ? nav.next() : setPaying(true))}
      />
      {paying ? <PaymentWindow demo={vm.demo} pending={pending} onBack={pay} onClose={() => setPaying(false)} /> : null}
    </>
  );
}

/** Neutrale tussenpagina naar de beveiligde betaalpagina. Kaartgegevens geef je daar in, niet bij AdSweet. */
function PaymentWindow({ demo, pending, onBack, onClose }: { demo: boolean; pending: boolean; onBack: () => void; onClose: () => void }) {
  const t = useTranslations("onboarding");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="mw-scrim">
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("redirect")} className="mw">
        <div role="status" className="mw-wait">
          <Loader />
          <span>{t("redirect")}</span>
        </div>
        <p className="as-muted">{t("redirectNote")}</p>
        {demo ? (
          <button type="button" className="cp-demo" onClick={onBack} disabled={pending}>
            {t("demoBack")}
          </button>
        ) : (
          <div className="mw-demo">
            <span>{t("payLater")}</span>
            <Button variant="secondary" onClick={onClose}>
              {t("close")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stap 11 · Live
// ---------------------------------------------------------------------------

export function StepLive() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const already = vm.draft?.status === "gepland";
  const [ticks, setTicks] = useState(already ? 5 : 0);
  const [pending, start] = useTransition();
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);
  const done = ticks >= 5;
  const list = (t.raw("liveList") as string[]).map((x) => x.replace("{n}", String(vm.draft?.slots.length ?? 5)));
  const go = () =>
    start(async () => {
      const res = await liveAction();
      if (!res.ok) return;
      for (let i = 1; i <= 5; i++) timers.current.push(window.setTimeout(() => setTicks(i), i * 450));
    });
  return (
    <>
      <h1 className="ob-h1">{done ? t("liveTitleDone") : t("liveTitle")}</h1>
      <ul className="ob-checklist">
        {list.map((x, i) => (
          <li key={x} className={i < ticks ? "ob-checklist--done" : undefined}>
            <span aria-hidden="true">{i < ticks ? <Icon name="check" size={12} strokeWidth={2} /> : null}</span>
            {x}
          </li>
        ))}
      </ul>
      {done ? (
        <>
          <div className="ob-stack">
            <p className="ob-strong">{t("sent")}</p>
            <p className="as-muted">{t("learning")}</p>
          </div>
          {vm.billing.founding ? (
            <div className="ob-box ob-box--row">
              <span>{t("first50")}</span>
              <Link className="as-btn as-btn--secondary" href="/hulp">
                {t("pick")}
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
      <StepFooter
        prev={done ? null : nav.prev}
        pending={pending || nav.pending || (ticks > 0 && !done)}
        label={done ? t("today") : t("go")}
        onNext={() => (done ? start(() => finishAction()) : go())}
      />
    </>
  );
}
