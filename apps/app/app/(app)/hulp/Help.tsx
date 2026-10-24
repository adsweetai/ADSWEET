"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Accordion, Icon, StatusBadge, useToast } from "@adsweet/ui";
import { TourCard } from "@/components/dot/TourCard";
import { PLAN_NAME } from "@/lib/plans";
import type { HelpVM } from "@/lib/server/help";
import { requestCallAction } from "./actions";

interface Card {
  t: string;
  tag: string;
  d: string;
  action?: ReactNode;
}

/** Hulp (App.dc.html#hulp). */
export function Help({ vm, siteUrl }: { vm: HelpVM; siteUrl: string }) {
  const t = useTranslations("help");
  const toast = useToast();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const query = q.trim().toLowerCase();
  const faq = (t.raw("faq") as [string, string][]).filter(([qq, a]) => !query || (qq + a).toLowerCase().includes(query));
  const support = t.raw(`support.${vm.plan}`) as [string, string, string];

  const btn = (label: string, onClick: () => void, lock = false) => (
    <button type="button" className="hp-btn" onClick={onClick} disabled={pending}>
      {lock ? <Icon name="lock" size={13} /> : null}
      {label}
    </button>
  );
  const ask = (kind: "kwartaal" | "onboarding") =>
    start(async () => {
      const res = await requestCallAction(kind);
      if (res.ok) {
        toast.show({ message: t("requestedToast") });
        router.refresh();
      }
    });
  const requested = <span className="as-tag">{t("requested")}</span>;

  const cards: Card[] = [
    {
      t: t("contact"),
      tag: PLAN_NAME[vm.plan],
      d: `${support[0]}. ${support[1]}`,
      action: btn(support[2], () => toast.show({ message: t("supportLater", { channel: support[0] }) })),
    },
    vm.plan === "agency"
      ? {
          t: t("manager.t"),
          tag: t("manager.tag"),
          d: t("manager.d"),
          action: btn(t("manager.btn"), () => toast.show({ message: t("supportLater", { channel: t("manager.t") }) })),
        }
      : {
          t: t("quarterly.t"),
          tag: t("quarterly.tag"),
          d: !vm.quarterly.allowed
            ? t("quarterly.dLocked")
            : vm.quarterly.call?.date
              ? t("quarterly.dPlanned", { date: vm.quarterly.call.date })
              : t("quarterly.d"),
          action: !vm.quarterly.allowed ? (
            <Link href="/abonnement" className="hp-btn">
              <Icon name="lock" size={13} />
              {t("quarterly.btnLocked")}
            </Link>
          ) : vm.quarterly.call ? (
            requested
          ) : (
            btn(t("quarterly.btn"), () => ask("kwartaal"))
          ),
        },
    {
      t: t("onboardingCall.t"),
      tag: t("onboardingCall.tag"),
      d: vm.onboarding.allowed ? t("onboardingCall.d") : t("onboardingCall.dOther"),
      action: !vm.onboarding.allowed ? undefined : vm.onboarding.call ? requested : btn(t("onboardingCall.btn"), () => ask("onboarding")),
    },
    {
      t: t("dwy.t"),
      tag: t("dwy.tag"),
      d: t("dwy.d"),
      action: (
        <a href={`${siteUrl}/done-with-you`} className="hp-btn" target="_blank" rel="noreferrer">
          {t("dwy.btn")}
        </a>
      ),
    },
    { t: t("partner.t"), tag: t("partner.tag"), d: t("partner.d") },
  ];

  return (
    <div className="hp">
      <label className="hp-search">
        <span>{t("search")}</span>
        <input type="search" className="as-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} />
      </label>
      <TourCard campaignId={vm.campaignId} />
      <div className="hp-faq">
        {faq.length ? <Accordion key={query} items={faq.map(([qq, a]) => ({ q: qq, a }))} /> : <p className="as-muted">{t("noResults", { q: q.trim() })}</p>}
      </div>
      <div className="hp-cards">
        {cards.map((c) => (
          <div key={c.t} className="hp-card">
            <span className="hp-card__head">
              <b>{c.t}</b>
              <span>{c.tag}</span>
            </span>
            <span className="hp-card__d">{c.d}</span>
            {c.action ? <span className="hp-card__action">{c.action}</span> : null}
          </div>
        ))}
      </div>
      <section className="hp-status" aria-labelledby="hp-status-title">
        <h2 id="hp-status-title">{t("statusTitle")}</h2>
        {vm.status.map((s) => (
          <div key={s.provider} className="hp-status__row">
            <span>{t(`providers.${s.provider}`)}</span>
            {s.state === "none" ? (
              <span className="as-tag">{t("status.none")}</span>
            ) : (
              <StatusBadge kind={s.state === "ok" ? "ok" : "act"} size="sm">
                {t(`status.${s.state}`)}
              </StatusBadge>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
