"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { breakEvenRoas, leadMax, maxCostPerSale } from "@adsweet/playbook";
import { Button, Input, Select, StatusBadge, Switch, TextButton, formatEuro, formatPercent, useToast } from "@adsweet/ui";
import { NAMING_TOKENS, fillTemplate, fillUtm, type Naming } from "@/lib/naming";
import type { AccountsVM, ConnectionRowVM, NamingVM, NumbersVM, PrivacyVM, ProfileVM } from "@/lib/server/settings";
import { MetaPicker } from "@/components/meta/MetaPicker";
import { metaSyncAction } from "@/app/meta-actions";
import { selectAccount } from "../shell-actions";
import {
  disconnectMetaAction,
  goalTypeAction,
  reconnectMetaAction,
  requestDeletionAction,
  rereadAction,
  saveNamingAction,
  saveNumbersAction,
  savePayerAction,
  saveProfileAction,
  saveTimezoneAction,
  setNotificationAction,
} from "./actions";
import { Row, Rows } from "./Row";

const num = (s: string) =>
  Number(
    String(s)
      .replace(/[€%\s.]/g, "")
      .replace(",", "."),
  ) || 0;
const frac = (s: string) => {
  const n = num(s);
  return n > 1 ? n / 100 : n;
};
const short = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

function ReadOnly({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations("settings");
  return canEdit ? null : <p className="st-note">{t("readOnly")}</p>;
}

function Alert({ children }: { children: ReactNode }) {
  return children ? (
    <p role="alert" className="st-alert">
      {children}
    </p>
  ) : null;
}

// ---------------------------------------------------------------------------
// Bedrijfsprofiel
// ---------------------------------------------------------------------------

export function ProfileForm({ vm, canEdit }: { vm: ProfileVM; canEdit: boolean }) {
  const t = useTranslations("settings");
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState(vm);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const F = (k: keyof ProfileVM) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const field = (k: keyof ProfileVM, opts: { span?: boolean; ph?: string } = {}) => (
    <Input
      key={k}
      label={t(`profile.${k}`)}
      value={f[k]}
      onChange={F(k)}
      placeholder={opts.ph}
      disabled={!canEdit}
      className={opts.span ? "st-span" : undefined}
    />
  );
  return (
    <form
      className="st-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveProfileAction(f);
          if (!res.ok) return setError(t("profile.errName"));
          setError("");
          toast.show({ message: t("saved") });
          router.refresh();
        });
      }}
    >
      <ReadOnly canEdit={canEdit} />
      <div className="st-grid">
        {field("name")}
        <Select
          label={t("profile.kind")}
          value={f.kind}
          disabled={!canEdit}
          options={(f.kind === "bureau" ? ["bureau"] : ["webshop", "dienstverlener", "lokaal", "zelfstandige"]).map((k) => ({
            value: k,
            label: t(`profile.kinds.${k}`),
          }))}
          onChange={F("kind")}
        />
        {field("website", { ph: "jouwzaak.be" })}
        {field("sells", { span: true })}
        {field("tone", { ph: t("profile.tonePh") })}
        {field("region")}
        {field("diff", { span: true, ph: t("optional") })}
        {field("competitors", { span: true, ph: t("profile.competitorsPh") })}
      </div>
      <Alert>{error}</Alert>
      {canEdit ? (
        <div className="st-actions">
          <Button type="submit" arrow={false} disabled={pending}>
            {t("save")}
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await rereadAction();
                if (res.ok) {
                  toast.show({ message: t("profile.rereadDone") });
                  router.refresh();
                } else setError(t(res.error === "site" ? "profile.noSite" : "profile.rereadFail"));
              })
            }
          >
            {t("profile.reread")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Cijfers en doelen
// ---------------------------------------------------------------------------

/** Nog geen doel: kies wat je advertenties moeten opleveren. Daarna vul je hier de bedragen in. */
function GoalPick({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations("settings.numbers");
  const router = useRouter();
  const [type, setType] = useState<"verkopen" | "aanvragen" | "zaak" | "anders">("verkopen");
  const [pending, start] = useTransition();
  return (
    <div className="st-form">
      <p className="st-note">{t("noGoal")}</p>
      {canEdit ? (
        <>
          <div role="radiogroup" aria-label={t("pickLabel")} className="as-pills">
            {(["verkopen", "aanvragen", "zaak", "anders"] as const).map((g) => (
              <button key={g} type="button" role="radio" aria-checked={type === g} className="as-pill" onClick={() => setType(g)}>
                {t(`pick.${g}`)}
              </button>
            ))}
          </div>
          <div className="st-actions">
            <Button
              arrow={false}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await goalTypeAction(type);
                  router.refresh();
                })
              }
            >
              {t("pickSave")}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function NumbersForm({ vm, canEdit }: { vm: NumbersVM; canEdit: boolean }) {
  const t = useTranslations("settings.numbers");
  const ts = useTranslations("settings");
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState(vm);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (vm.kind === "nogoal") return <GoalPick canEdit={canEdit} />;
  if (vm.kind === "none") return <p className="st-note">{t("none", { goal: t(`goals.${vm.goalType === "zaak" ? "zaak" : "anders"}`) })}</p>;
  const F = (k: keyof NumbersVM) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const loser = vm.loserMultiple;
  let calc = "";
  if (vm.kind === "sales") {
    const m = frac(f.margin);
    const aov = num(f.aov);
    if (m > 0 && m < 1 && aov > 0)
      calc = t("calcSales", {
        m: Math.round(m * 100),
        be: short(breakEvenRoas(m)),
        max: formatEuro(maxCostPerSale(aov, m), 2),
        loser: formatEuro(maxCostPerSale(aov, m) * loser, 2),
      });
  } else {
    const clv = num(f.clv);
    const m = frac(f.lmargin);
    const c = /(\d+)\s*op\s*(\d+)/i.exec(f.chance);
    const p = c ? Number(c[1]) / Number(c[2]) : frac(f.chance);
    const cpl = num(f.cpl);
    const max = clv > 0 && m > 0 && p > 0 ? Math.round(leadMax(clv, m, p) * 100) / 100 : 0;
    const limit = formatEuro((cpl || max) * loser);
    if (max) calc = t("calcLeads", { max: formatEuro(max), clv: formatEuro(clv), m: formatPercent(m), p: formatPercent(p), loser: limit });
    else if (cpl) calc = t("calcLeadsTarget", { target: formatEuro(cpl), loser: limit });
  }
  const field = (k: keyof NumbersVM, label: string, ph?: string) => (
    <Input key={k} label={label} value={f[k] as string} onChange={F(k)} placeholder={ph} inputMode="decimal" disabled={!canEdit} />
  );
  return (
    <form
      className="st-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveNumbersAction({ aov: f.aov, margin: f.margin, roas: f.roas, cpl: f.cpl, clv: f.clv, lmargin: f.lmargin, chance: f.chance });
          if (!res.ok) return setError(t(res.error === "leads" ? "errLeads" : "errSales"));
          setError("");
          toast.show({ message: t("savedToast") });
          router.refresh();
        });
      }}
    >
      <ReadOnly canEdit={canEdit} />
      <div className="st-grid">
        {vm.kind === "sales"
          ? [field("aov", t("aov")), field("margin", t("margin")), field("roas", t("roas"), t("optionalPh"))]
          : [field("cpl", t("cpl")), field("clv", t("clv")), field("lmargin", t("lmargin")), field("chance", t("chance"), t("chancePh"))]}
      </div>
      {calc ? (
        <div role="status" className="st-calc">
          <b>{calc}</b>
          <span>{t("calcNote")}</span>
        </div>
      ) : null}
      <Alert>{error}</Alert>
      {canEdit ? (
        <div className="st-actions">
          <Button type="submit" arrow={false} disabled={pending}>
            {ts("save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Koppelingen
// ---------------------------------------------------------------------------

export function ConnectionsList({
  rows,
  biz,
  canEdit,
  metaLive,
  metaConnect,
  lastSync,
}: {
  rows: ConnectionRowVM[];
  biz: string;
  canEdit: boolean;
  metaLive: boolean;
  metaConnect: boolean;
  lastSync: string | null;
}) {
  const t = useTranslations("settings.connections");
  const tp = useTranslations("metaPicker");
  const toast = useToast();
  const router = useRouter();
  // Terug uit het venster van Meta: ?meta=perm (geen toegang gegeven) of ?meta=fout.
  const back = useSearchParams().get("meta");
  const fbHref = metaConnect ? "/auth/meta?next=/instellingen/koppelingen" : null;
  const [confirm, setConfirm] = useState(false);
  const [picking, setPicking] = useState(back === "ok" && metaLive);
  const [pending, start] = useTransition();
  const later = (name: string) => toast.show({ message: t("connectLater", { name }) });
  return (
    <>
      <Rows>
        {rows.map((r) => {
          const name = t(`providers.${r.provider}`);
          if (r.provider === "meta") {
            const on = r.status === "gekoppeld" || r.status === "verlopen";
            return (
              <Row
                key={r.provider}
                icon="link"
                title={name}
                sub={
                  on
                    ? `${t("metaSub", { biz, date: r.since ?? "[datum]" })}${lastSync ? ` · ${t("lastSync", { when: lastSync })}` : ""}`
                    : r.status === "los"
                      ? t("off")
                      : t("metaSubNone")
                }
              >
                {on ? (
                  <StatusBadge kind={r.status === "verlopen" ? "act" : "ok"} size="sm">
                    {r.status === "verlopen" ? t("expired") : t("ok")}
                  </StatusBadge>
                ) : null}
                {canEdit ? (
                  <>
                    <TextButton
                      disabled={pending}
                      onClick={() =>
                        metaLive
                          ? setPicking((p) => !p)
                          : start(async () => {
                              const res = await reconnectMetaAction();
                              if (!res.ok) return router.push(res.href);
                              toast.show({ message: t("reconnected") });
                              router.refresh();
                            })
                      }
                    >
                      {on ? t("reconnect") : t("connect")}
                    </TextButton>
                    {on && metaLive ? (
                      <TextButton
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            toast.show({ message: tp("syncing") });
                            const res = await metaSyncAction();
                            toast.show({
                              message:
                                res.ok && res.result
                                  ? tp("synced", { campaigns: res.result.campaigns, ads: res.result.ads, days: res.result.days })
                                  : tp("syncFailed", { error: res.error ?? "" }),
                            });
                            router.refresh();
                          })
                        }
                      >
                        {tp("syncNow")}
                      </TextButton>
                    ) : null}
                    {on ? <TextButton onClick={() => setConfirm(true)}>{t("disconnect")}</TextButton> : null}
                  </>
                ) : null}
              </Row>
            );
          }
          const sub = r.status === "gekoppeld" ? t("connectedOn", { date: r.since ?? "[datum]" }) : r.provider === "slack" ? t("slackSub") : t("notConnected");
          return (
            <Row key={r.provider} icon="link" title={name} sub={sub}>
              {r.status === "gekoppeld" ? (
                <StatusBadge kind="ok" size="sm">
                  {t("ok")}
                </StatusBadge>
              ) : null}
              {canEdit && r.status !== "gekoppeld" ? <TextButton onClick={() => later(name)}>{t("connect")}</TextButton> : null}
            </Row>
          );
        })}
        <Row icon="link" title={t("capi")} sub={t("later")} />
      </Rows>
      {back === "perm" || back === "fout" ? (
        <p role="alert" className="mp-alert">
          {tp(back === "perm" ? "fbDenied" : "fbFailed")}
        </p>
      ) : null}
      {picking ? (
        <MetaPicker
          fbHref={fbHref}
          onConnected={() => {
            setPicking(false);
            router.refresh();
          }}
        />
      ) : null}
      {confirm ? (
        <div className="st-confirm" role="alertdialog" aria-label={t("disconnect")}>
          <p>{t("disconnectConfirm")}</p>
          <div className="st-actions">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await disconnectMetaAction();
                  setConfirm(false);
                  toast.show({ message: t("disconnected") });
                  router.refresh();
                })
              }
            >
              {t("disconnectYes")}
            </Button>
            <Button arrow={false} onClick={() => setConfirm(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Advertentieaccounts
// ---------------------------------------------------------------------------

export function AccountsList({ vm }: { vm: AccountsVM }) {
  const t = useTranslations("settings.accounts");
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const kind = (s: AccountsVM["rows"][number]["status"]) => (s === "actief" ? "ok" : s === "uitgeschakeld" ? "warn" : "act");
  return (
    <Rows>
      {vm.rows.length === 0 ? <Row title={t("none")} /> : null}
      {vm.rows.map((a) => (
        <Row
          key={a.id}
          title={a.name}
          sub={
            a.aov && a.margin
              ? t("subSales", { currency: a.currency, m: a.margin, aov: a.aov })
              : t("sub", { currency: a.currency, status: t(`status.${a.status}`) })
          }
        >
          <StatusBadge kind={kind(a.status)} size="sm">
            {t(`status.${a.status}`)}
          </StatusBadge>
          {a.current ? (
            <span className="as-small as-muted">{t("current")}</span>
          ) : (
            <TextButton
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await selectAccount(a.id);
                  toast.show({ message: t("switched", { name: a.name }) });
                  router.refresh();
                })
              }
            >
              {t("switch")}
            </TextButton>
          )}
        </Row>
      ))}
      <Row
        title={t("addTitle")}
        sub={
          vm.add === "agency"
            ? t("addAgency")
            : vm.add === "locked"
              ? t("addLocked")
              : vm.add === "full"
                ? t("addFull", { used: vm.used, max: vm.max })
                : t("addFree", { used: vm.used, max: vm.max })
        }
      >
        {vm.add === "agency" ? (
          <Link className="as-textbtn" href="/klanten">
            {t("toClients")}
          </Link>
        ) : vm.add === "locked" ? (
          <Link className="as-textbtn" href="/abonnement">
            {t("seeScale")}
          </Link>
        ) : vm.add === "free" ? (
          <TextButton onClick={() => toast.show({ message: t("addLater") })}>{t("addBtn")}</TextButton>
        ) : null}
      </Row>
    </Rows>
  );
}

// ---------------------------------------------------------------------------
// Naamgeving en UTM's
// ---------------------------------------------------------------------------

export function NamingForm({ vm, canEdit }: { vm: NamingVM; canEdit: boolean }) {
  const t = useTranslations("settings.naming");
  const ts = useTranslations("settings");
  const toast = useToast();
  const [f, setF] = useState<Omit<Naming, "short">>({ campaign: vm.naming.campaign, ad_set: vm.naming.ad_set, ad: vm.naming.ad, utm: vm.naming.utm });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const F = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const s = vm.sample;
  const adVars = { code: s.ad.code, fase: s.ad.fase, soort: s.ad.soort };
  const example = [fillTemplate(f.campaign, s.campaign), fillTemplate(f.ad_set, s.adSet), fillTemplate(f.ad, s.ad), fillUtm(f.utm, s.utm, adVars)];
  const labels: Record<keyof typeof f, string> = { campaign: t("campaign"), ad_set: t("adSet"), ad: t("ad"), utm: t("utm") };
  return (
    <form
      className="st-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveNamingAction(f);
          if (!res.ok) return setError(t("errTemplate"));
          setError("");
          toast.show({ message: ts("saved") });
        });
      }}
    >
      <ReadOnly canEdit={canEdit} />
      <div className="st-grid">
        {(Object.keys(labels) as (keyof typeof f)[]).map((k) => (
          <div key={k} className="st-span st-stack">
            <Input label={labels[k]} value={f[k]} onChange={F(k)} disabled={!canEdit} spellCheck={false} />
            <span className="st-tokens">
              {NAMING_TOKENS[k].map((x) => (
                <code key={x}>{`{${x}}`}</code>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="st-example" aria-live="polite">
        <span className="st-example__label">{t("example")}</span>
        {example.map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </div>
      <p className="st-note">{t("help")}</p>
      <Alert>{error}</Alert>
      {canEdit ? (
        <div className="st-actions">
          <Button type="submit" arrow={false} disabled={pending}>
            {ts("save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Wie betaalt
// ---------------------------------------------------------------------------

export function PayerForm({ vm, canEdit }: { vm: { payer: string; beneficiary: string }; canEdit: boolean }) {
  const t = useTranslations("settings.payer");
  const ts = useTranslations("settings");
  const toast = useToast();
  const [f, setF] = useState(vm);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="st-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePayerAction(f);
          if (!res.ok) return setError(t("err"));
          setError("");
          toast.show({ message: t("savedToast") });
        });
      }}
    >
      <ReadOnly canEdit={canEdit} />
      <div className="st-grid">
        <Input label={t("payer")} value={f.payer} onChange={(e) => setF({ ...f, payer: e.target.value })} disabled={!canEdit} />
        <Input label={t("beneficiary")} value={f.beneficiary} onChange={(e) => setF({ ...f, beneficiary: e.target.value })} disabled={!canEdit} />
      </div>
      <p className="st-note">{t("help")}</p>
      <Alert>{error}</Alert>
      {canEdit ? (
        <div className="st-actions">
          <Button type="submit" arrow={false} disabled={pending}>
            {ts("save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Meldingen
// ---------------------------------------------------------------------------

export function NotificationsList({ rows }: { rows: { type: string; on: boolean }[] }) {
  const t = useTranslations("settings.notifications");
  const tn = useTranslations("notifications.types");
  const toast = useToast();
  const [state, setState] = useState(() => Object.fromEntries(rows.map((r) => [r.type, r.on])));
  const [, start] = useTransition();
  return (
    <>
      <Rows>
        {rows.map((r) => {
          const on = state[r.type];
          const label = tn(`${r.type}.type`);
          return (
            <Row key={r.type} title={label} sub={on ? t("on") : t("off")}>
              <Switch
                checked={on}
                label={label}
                onChange={(next) => {
                  setState((s) => ({ ...s, [r.type]: next }));
                  start(async () => {
                    await setNotificationAction(r.type, next);
                    toast.show({ message: next ? t("savedOn", { type: label }) : t("savedOff", { type: label }) });
                  });
                }}
              />
            </Row>
          );
        })}
      </Rows>
      <p className="st-note">{t("note")}</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Taal en regio
// ---------------------------------------------------------------------------

export function LanguageRows({ vm, timezones }: { vm: { locale: string; timezone: string; currency: string }; timezones: readonly string[] }) {
  const t = useTranslations("settings.language");
  const toast = useToast();
  const [tz, setTz] = useState(vm.timezone);
  const [, start] = useTransition();
  return (
    <Rows>
      <Row title={t("language")} sub={t(`names.${vm.locale === "fr" || vm.locale === "en" ? vm.locale : "nl"}`)}>
        <span role="group" aria-label={t("language")} className="st-langs">
          {(["nl", "fr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={vm.locale === l}
              aria-disabled={l !== "nl" || undefined}
              title={l === "nl" ? t(`names.${l}`) : `${t(`names.${l}`)}: ${t("later")}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </span>
      </Row>
      <Row title={t("timezone")} sub={tz}>
        <select
          aria-label={t("timezone")}
          value={tz}
          onChange={(e) => {
            const v = e.target.value;
            setTz(v);
            start(async () => {
              await saveTimezoneAction(v);
              toast.show({ message: t("tzSaved", { tz: v }) });
            });
          }}
        >
          {timezones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </Row>
      <Row title={t("currency")} sub={vm.currency === "EUR" ? t("euro") : vm.currency}>
        <span className="as-small as-muted">{t("currencyNote")}</span>
      </Row>
    </Rows>
  );
}

// ---------------------------------------------------------------------------
// Privacy en gegevens
// ---------------------------------------------------------------------------

export function PrivacyRows({ vm, canEdit, siteUrl }: { vm: PrivacyVM; canEdit: boolean; siteUrl: string }) {
  const t = useTranslations("settings.privacy");
  const toast = useToast();
  const router = useRouter();
  const [scopes, setScopes] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const del = (on: boolean) =>
    start(async () => {
      const res = await requestDeletionAction(on);
      if (!res.ok) return;
      setConfirm(false);
      toast.show({ message: on ? t("deleteToast") : t("deleteUndone") });
      router.refresh();
    });
  return (
    <>
      <Rows>
        <Row title={t("download")} sub={t("downloadSub")}>
          {canEdit ? (
            <a className="as-textbtn" href="/api/export" download>
              {t("downloadBtn")}
            </a>
          ) : null}
        </Row>
        <Row title={t("dpa")} sub={t("dpaSub")}>
          <a className="as-textbtn" href={`${siteUrl}/verwerkersovereenkomst`} target="_blank" rel="noreferrer">
            {t("view")}
          </a>
        </Row>
        <Row title={t("meta")} sub={vm.metaConnected ? (scopes ? t("metaScopes") : t("metaSub")) : t("metaNone")}>
          {vm.metaConnected ? (
            <TextButton aria-expanded={scopes} onClick={() => setScopes(!scopes)}>
              {t("view")}
            </TextButton>
          ) : null}
        </Row>
        <Row title={t("google")} sub={t("googleSub")} />
        <Row
          title={t("delete")}
          sub={vm.deletionRequested ? t("deleteRequested", { date: vm.deletionRequested }) : vm.isOwner ? t("deleteSub") : t("ownerOnly")}
        >
          {vm.isOwner ? (
            vm.deletionRequested ? (
              <TextButton disabled={pending} onClick={() => del(false)}>
                {t("deleteUndo")}
              </TextButton>
            ) : (
              <TextButton onClick={() => setConfirm(true)}>{t("deleteBtn")}</TextButton>
            )
          ) : null}
        </Row>
      </Rows>
      {confirm ? (
        <div className="st-confirm" role="alertdialog" aria-label={t("delete")}>
          <p>{t("deleteConfirm", { org: vm.orgName })}</p>
          <div className="st-actions">
            <Button variant="secondary" disabled={pending} onClick={() => del(true)}>
              {t("deleteYes")}
            </Button>
            <Button arrow={false} onClick={() => setConfirm(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
