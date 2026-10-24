"use client";

import Link from "next/link";
import { Fragment, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ActionCard, AdLabel, EuroTile, Icon, Loader, PhasePill, StatusBadge, SweetMoment, useToast, type StatusKind } from "@adsweet/ui";
import { PlaybookTip, PlaybookWarning } from "@/components/ui";
import { useGate } from "@/components/shell/Gate";
import type { CardButton, CardVM, TodayVM, Variant } from "@/lib/server/today";
import { selectAccount } from "../shell-actions";
import { applyCard, decideCard, reopenCard, undoChange } from "./actions";

/** "<term>kost per verkoop</term>" wordt een vakwoord met een stippellijn. */
function withTerms(text: string): ReactNode {
  const parts = text.split(/<term>(.*?)<\/term>/g);
  return parts.map((p, i) =>
    i % 2 ? (
      <span key={i} className="as-term">
        {p}
      </span>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

const DOTS = ["roos", "citroen", "munt", "bes"];

export function VandaagView({ vm }: { vm: TodayVM }) {
  const t = useTranslations("today");
  const tu = useTranslations("ui");
  const tc = useTranslations("cards");
  const tl = useTranslations("ui.labels");
  const router = useRouter();
  const toast = useToast();
  const gate = useGate();
  const [pending, start] = useTransition();

  const onButton = (card: CardVM, b: CardButton) => {
    if (b.kind === "link" && b.href) return router.push(b.href);
    if (b.kind === "gate" && b.gate) return gate(b.gate);
    if (b.kind === "account" && b.accountId)
      return start(async () => {
        await selectAccount(b.accountId!);
        router.refresh();
      });
    if (b.kind === "apply")
      return start(async () => {
        const res = await applyCard(card.id);
        if (!res.ok) return toast.show({ message: tc("error") });
        router.refresh();
        toast.show({
          message: b.toast ?? "",
          undo: res.logId
            ? () =>
                start(async () => {
                  await undoChange(res.logId!);
                  router.refresh();
                })
            : undefined,
        });
      });
    if (b.kind === "decide" && b.decision)
      return start(async () => {
        const res = await decideCard(card.id, b.decision!);
        router.refresh();
        if (res.ok)
          toast.show({
            message: b.toast ?? "",
            undo: () =>
              start(async () => {
                await reopenCard(card.id);
                router.refresh();
              }),
          });
      });
  };

  const later = (card: CardVM) =>
    start(async () => {
      const res = await decideCard(card.id, "later");
      router.refresh();
      if (res.ok)
        toast.show({
          message: tc("laterToast"),
          undo: () =>
            start(async () => {
              await reopenCard(card.id);
              router.refresh();
            }),
        });
    });

  const toAction = (card: CardVM, b?: CardButton) =>
    b ? { label: b.label, locked: b.locked, disabled: pending, onClick: () => onButton(card, b) } : undefined;

  return (
    <div className="vd" aria-busy={pending || undefined}>
      {vm.showVariants ? <Variants current={vm.variant} /> : null}
      <header data-tour="greet" className="vd-head">
        <span aria-hidden="true" className="vd-dots">
          {DOTS.map((d) => (
            <span key={d} className={`as-dot--${d}${d === "munt" ? " vd-dot--square" : ""}`} />
          ))}
        </span>
        <h1 className="as-h-greeting">{vm.greeting}</h1>
        <p className="vd-summary">{vm.summary}</p>
        {vm.status.length ? (
          <span className="vd-status">
            {vm.status.map((s) => (
              <span key={s.kind} className={`vd-status__item vd-status__item--${s.kind}`}>
                <Icon name={s.kind === "info" ? "bulb" : s.kind} size={15} />
                {s.text}
              </span>
            ))}
          </span>
        ) : null}
      </header>

      {vm.tuning ? (
        <Link href="/afstemmen/1" data-theme="light" className="vd-tuning">
          <span className="vd-tuning__left">
            <span aria-hidden="true" className="vd-dots vd-dots--sm">
              {DOTS.slice(0, 3).map((d) => (
                <span key={d} className={`as-dot--${d}`} />
              ))}
            </span>
            <span className="vd-tuning__text">
              <b>{t("tuningTitle")}</b>
              <span>{t("tuningText")}</span>
            </span>
          </span>
          <span className="vd-tuning__go">{t("tuningGo")}</span>
        </Link>
      ) : null}

      {vm.sweet ? <SweetMoment box>{vm.sweet}</SweetMoment> : null}

      {vm.accounts ? <Accounts vm={vm} /> : null}

      {vm.tile ? (
        <div data-tour="tile">
          <EuroTile
            label={vm.tile.caption}
            blocks={vm.tile.blocks.map((b) => ({ label: b.term ? <span className="as-term">{b.label}</span> : b.label, value: b.value }))}
            caption={vm.tile.caption}
            tag={vm.tile.example ? tu("example") : undefined}
            note={vm.tile.note}
            status={vm.tile.status && vm.tile.status.kind !== "rapport" ? { kind: vm.tile.status.kind as StatusKind, label: vm.tile.status.label } : undefined}
          />
          {vm.tile.status?.kind === "rapport" ? (
            <div className="vd-rapport">
              <AdLabel kind="rapport">{tl("rapport")}</AdLabel>
            </div>
          ) : null}
        </div>
      ) : null}

      {vm.dayOne ? (
        <section className="vd-day1">
          <div role="status" className="vd-day1__head">
            <Loader />
            <span>{t("d1Title")}</span>
          </div>
          <p className="as-muted" style={{ margin: 0 }}>
            {t("d1Text")}
          </p>
          <ul className="vd-day1__list">
            {vm.dayOne.ads.map((a) => (
              <li key={a.name}>
                <span>{a.name}</span>
                <span className={a.status === "goedgekeurd" ? "vd-ok" : "as-muted"}>
                  <Icon name={a.status === "goedgekeurd" ? "ok" : a.status === "afgekeurd" ? "act" : "hourglass"} size={14} />
                  {a.status === "goedgekeurd" ? t("d1Approved") : a.status === "afgekeurd" ? t("d1Rejected") : t("d1Review")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="vd-grid">
        <section data-tour="cards" aria-labelledby="h-doe" className="vd-cards">
          {vm.cards.length ? (
            <h2 id="h-doe" className="as-h-card">
              {t("doTitle")}
            </h2>
          ) : null}
          {vm.noCards ? (
            <p id="h-doe" className="vd-none">
              {t("noneText")}
            </p>
          ) : null}
          {vm.cards.map((c, i) => (
            <ActionCard
              key={c.id}
              id={`kaart-${c.type}`}
              proposalLabel={tu("proposal")}
              robijn={i === 0 && !vm.sweet}
              badge={c.badge}
              title={c.title}
              stats={c.stats}
              text={c.text}
              explain={c.explain ? withTerms(c.explain) : undefined}
              why={
                c.why
                  ? {
                      label: tu("why"),
                      content: (
                        <>
                          {c.why.lines.map((l) => (
                            <span key={l}>{l}</span>
                          ))}
                          <Link className="as-link" href={c.why.lesson.href}>
                            {c.why.lesson.label}
                          </Link>
                        </>
                      ),
                    }
                  : undefined
              }
              warning={c.warning ? <PlaybookWarning reason={c.warning} /> : undefined}
              tip={c.tip ? tu("tipPrefix", { tip: c.tip }) : undefined}
              primary={toAction(c, c.primary)}
              secondary={c.secondary?.map((b) => toAction(c, b)!)}
              later={c.later ? { label: tu("later"), onClick: () => later(c) } : undefined}
            />
          ))}
        </section>
        <aside data-tour="lists" className="vd-lists">
          {vm.lists.map((l) => (
            <section key={l.title} className="vd-list">
              <h2 className="vd-list__title">{l.title}</h2>
              {l.ads.map((a) => (
                <Link key={a.id} href={`/advertenties?advertentie=${a.id}`} className="vd-adrow">
                  <span aria-hidden="true" className="vd-adrow__thumb">
                    <Icon name={a.kind === "video" ? "video" : "image"} size={14} />
                  </span>
                  <span className="vd-adrow__body">
                    <b>{a.name}</b>
                    <span className="vd-adrow__chips">
                      <PhasePill phase={a.phase} size="sm" />
                      <AdLabel kind={a.label} size="sm">
                        {tl(a.label)}
                      </AdLabel>
                    </span>
                    <span className="vd-adrow__metric">{a.metric}</span>
                  </span>
                </Link>
              ))}
            </section>
          ))}
          <PlaybookTip>{vm.tip}</PlaybookTip>
        </aside>
      </div>
      <p className="vd-next">{t("next")}</p>
    </div>
  );
}

function Variants({ current }: { current: Variant }) {
  const t = useTranslations("today");
  const variants: Variant[] = ["normaal", "dag1", "rapport", "leeg"];
  return (
    <div role="group" aria-label={t("variantsLabel")} className="vd-variants">
      {variants.map((v) => (
        <Link key={v} href={`/vandaag?variant=${v}`} aria-pressed={current === v} className="vd-variant" replace>
          {t(`variants.${v}`)}
        </Link>
      ))}
    </div>
  );
}

function Accounts({ vm }: { vm: TodayVM }) {
  const t = useTranslations("today");
  const ts = useTranslations("ui.status");
  const router = useRouter();
  const [, start] = useTransition();
  const a = vm.accounts!;
  return (
    <section aria-label={t("accTitle")} className="vd-accounts">
      <h2 className="as-h-card">{t("accTitle")}</h2>
      <div className="as-tablewrap">
        <table className="as-table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>{t("accCols.a")}</th>
              <th>{t("accCols.spend")}</th>
              <th>{t("accCols.sales")}</th>
              <th>{t("accCols.rev")}</th>
              <th>{t("accCols.roas")}</th>
              <th className="as-left">{t("accCols.status")}</th>
            </tr>
          </thead>
          <tbody>
            {a.rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    type="button"
                    className="vd-accname"
                    aria-current={r.active || undefined}
                    onClick={() =>
                      start(async () => {
                        await selectAccount(r.id);
                        router.refresh();
                      })
                    }
                  >
                    {r.name}
                  </button>
                </td>
                <td>{r.spend}</td>
                <td>{r.sales}</td>
                <td>{r.revenue}</td>
                <td>
                  {r.roas} <span className="as-muted">/ {r.be}</span>
                </td>
                <td className="as-left">
                  <StatusBadge kind={r.status} size="md">
                    {ts(r.status)}
                  </StatusBadge>
                </td>
              </tr>
            ))}
            <tr className="as-total">
              <td>{t("accTotal")}</td>
              <td>{a.total.spend}</td>
              <td>{a.total.sales}</td>
              <td>{a.total.revenue}</td>
              <td>{a.total.roas}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <span className="as-small">{a.note}</span>
    </section>
  );
}
