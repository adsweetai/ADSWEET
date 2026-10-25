"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Icon, Input, Select, StatusBadge, Tag, useToast, type IconName } from "@adsweet/ui";
import { MetaWindow, type MetaOutcome } from "@/components/auth/MetaWindow";
import { MetaPicker } from "@/components/meta/MetaPicker";
import { ExampleTag, Proposal } from "@/components/ui";
import { metaAction, payerAction } from "../actions";
import { StepFooter, useStepNav, useVM } from "../shared";

// ---------------------------------------------------------------------------
// Stap 6 · Koppelen
// ---------------------------------------------------------------------------

export function StepConnect() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const tm = useTranslations("metaWindow");
  const tp = useTranslations("metaPicker");
  const router = useRouter();
  const path = usePathname();
  // Terug uit het venster van Meta: ?meta=perm (geen toegang gegeven) of ?meta=fout.
  const back = useSearchParams().get("meta");
  const nav = useStepNav();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<MetaOutcome | null>(back === "perm" ? "perm" : null);
  const fbHref = vm.metaConnect ? `/auth/meta?next=${encodeURIComponent(path)}` : null;
  const [more, setMore] = useState(false);
  const [payer, setPayer] = useState(vm.payer);
  const [beneficiary, setBeneficiary] = useState(vm.beneficiary);
  const kind =
    vm.goal.type === "verkopen" ? "sales" : vm.goal.type === "aanvragen" || (vm.goal.type === "zaak" && vm.goal.zaakMode === "aanvragen") ? "leads" : "none";
  const rows = (t.raw("connRows") as string[])
    .map((label, i) => ({
      label,
      icon: (["flag", "camera", "wallet", "code"] as IconName[])[i],
      value: vm.meta ? [vm.meta.page, vm.meta.ig, vm.meta.account, vm.meta.pixel][i] : "",
    }))
    .filter((_, i) => i < 3 || kind !== "none");
  const linked = !!vm.meta;
  const onOutcome = (o: MetaOutcome) => {
    setOpen(false);
    nav.start(async () => {
      const res = await metaAction(o);
      setError(res.ok ? null : (res.error ?? "perm"));
    });
  };
  const errText = error ? tm(`errors.${error === "ok" || error === "ok_bestaand" ? "perm" : error}`) : "";
  return (
    <>
      <header className="ob-header">
        <h1 className="ob-h1">{t("connectTitle")}</h1>
        <p className="ob-lead">{t("connectLead")}</p>
      </header>
      {error && !linked ? (
        <div role="alert" className="ob-alert ob-alert--row">
          <Icon name="act" size={18} />
          <div className="ob-stack">
            <span>{errText}</span>
            <div className="ob-row">
              <Button variant="secondary" onClick={() => setOpen(true)}>
                {error === "expired" ? tm("relink") : tm("retry")}
              </Button>
              {error === "noacc" ? (
                <Link className="as-link" href="/academy">
                  {tm("howMake")}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {!vm.demo && !linked && back === "fout" ? (
        <p role="alert" className="ob-alert">
          {tp("fbFailed")}
        </p>
      ) : null}
      {!vm.demo && !linked ? (
        vm.metaLive ? (
          <MetaPicker onConnected={() => router.refresh()} fbHref={fbHref} />
        ) : !vm.metaConnect ? (
          <p role="alert" className="ob-alert">
            {tp("notConfigured")}
          </p>
        ) : null
      ) : null}
      <div className="ob-conns">
        {rows.map((r) => (
          <div key={r.label} className="ob-conn">
            <span className="ob-conn__label">
              <Icon name={r.icon} size={18} />
              {r.label}
            </span>
            {linked && r.value ? (
              <Select label={r.label} className="ob-conn__select" options={[{ value: r.value, label: r.value }]} value={r.value} onChange={() => undefined} />
            ) : (
              <span className="as-muted as-small">{t("notYet")}</span>
            )}
          </div>
        ))}
      </div>
      {linked && vm.meta ? (
        <>
          <section className="ob-group">
            <h2 className="ob-h2">{t("checks")}</h2>
            <div className="ob-checks">
              <div className="ob-check">
                <span>{t("cur")}</span>
                <StatusBadge kind="ok" size="sm">
                  {t("okS")}
                </StatusBadge>
              </div>
              <div className="ob-check">
                <span>{t("pay")}</span>
                <StatusBadge kind="ok" size="sm">
                  {t("okS")}
                </StatusBadge>
              </div>
              {kind !== "none" ? (
                <div className="ob-check">
                  <span>{kind === "sales" ? t("pixelSales") : t("pixelLeads")}</span>
                  <StatusBadge kind={vm.meta.pixelOk ? "ok" : "warn"} size="sm">
                    {vm.meta.pixelOk ? t("okS") : t("warnS")}
                  </StatusBadge>
                  {!vm.meta.pixelOk ? (
                    <p className="ob-check__warn">
                      {t("pixelWarn")}{" "}
                      <Link className="as-link" href="/academy">
                        {t("pixelLesson")}
                      </Link>{" "}
                      ·{" "}
                      <a className="as-link" href="https://adsweet.ai/done-with-you">
                        Done With You
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
          <section className="ob-group">
            <span className="ob-label">{t("payer")}</span>
            <span className="as-small as-muted">{t("payerNote")}</span>
            <div className="ob-grid">
              <Input label={t("payerA")} value={payer} onChange={(e) => setPayer(e.target.value)} />
              <Input label={t("payerB")} value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
            </div>
          </section>
        </>
      ) : null}
      <div className="ob-more">
        <button type="button" className="am-extras-toggle" aria-expanded={more} onClick={() => setMore((m) => !m)}>
          <span>{t("moreConn")}</span>
          <Icon name="plus" size={16} />
        </button>
        {more ? (
          <div className="ob-conns">
            {["Google Ads", "Shopify", "Google Analytics", "Google Drive", "Dropbox", "Canva", "Figma"].map((x) => (
              <div key={x} className="ob-conn">
                <span className="ob-conn__label">
                  <Icon name="link" size={16} />
                  {x}
                </span>
                <button type="button" className="as-textbtn" onClick={() => toast.show({ message: t("connLater", { name: x }) })}>
                  {t("connect")}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <StepFooter
        prev={nav.prev}
        pending={nav.pending}
        label={linked ? t("next") : t("connectFb")}
        disabled={!linked && !vm.demo && !fbHref}
        onNext={() => (linked ? nav.next(() => payerAction(payer, beneficiary)) : setOpen(true))}
      />
      {open ? <MetaWindow demo={vm.demo} existingOption onOutcome={onOutcome} onClose={() => setOpen(false)} realHref={fbHref} /> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Stap 7 · Je bestaande advertenties (alleen met bestaande campagnes)
// ---------------------------------------------------------------------------

export function StepExisting() {
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const [applied, setApplied] = useState(false);
  const cards = t.raw("auditCards") as [string, string][];
  return (
    <>
      <header className="ob-header ob-header--row">
        <div>
          <h1 className="ob-h1">{t("existingTitle")}</h1>
          <p className="ob-lead">{t("existingLead")}</p>
        </div>
        <span className="ob-score">
          <b>48</b>
          <span>/ 100</span>
          <ExampleTag />
        </span>
      </header>
      {cards.map(([title, text], i) => (
        <article key={title} className="ob-audit">
          <Proposal robijn={i === 0} />
          <h3>{title}</h3>
          <p className="as-muted">{text}</p>
          {i === 0 && !applied ? (
            <Button arrow={false} onClick={() => setApplied(true)}>
              {t("apply")}
            </Button>
          ) : null}
          {i === 0 && applied ? (
            <span role="status" className="ob-done">
              <Icon name="ok" size={16} />
              {t("appliedDone")}
            </span>
          ) : null}
        </article>
      ))}
      <span className="as-small as-muted">
        <Tag>{t("exampleTag")}</Tag> {t("existingNote")}
      </span>
      <StepFooter prev={nav.prev} label={t("next")} pending={nav.pending} onNext={() => nav.next()} />
    </>
  );
}
