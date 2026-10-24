"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CampaignGoal, CampaignKind } from "@adsweet/db";
import {
  Button,
  ChoiceCards,
  DotCharacter,
  Icon,
  Input,
  Steps,
  SwitchRow,
  formatDashDate,
  formatDayMonth,
  formatMonthCode,
  useToast,
  type IconName,
} from "@adsweet/ui";
import { LinkButton } from "@/components/LinkButton";
import { PlaybookWarning } from "@/components/ui";
import type { MakerContext } from "@/lib/server/campaigns";
import { dotFillAction } from "../../dot-actions";
import { createCampaignAction } from "../actions";

type Strategy = CampaignKind;
type Deviation = "ads" | "sets" | "budget" | "perSet";

interface State {
  step: number;
  strat: Strategy;
  goal: CampaignGoal;
  chan: "meta" | "google";
  sets: number;
  ads: number;
  budget: string;
  perSet: boolean;
  from: string;
  to: string;
  ok: Partial<Record<Deviation, boolean>>;
}

const STRATS: Strategy[] = ["vast", "solden", "bf", "feest", "event", "nieuw", "catalogus"];
const GOALS: CampaignGoal[] = ["verkopen", "aanvragen", "volgers", "bereik", "evenement"];
const STEP_WARNS: Record<number, Deviation[]> = { 3: ["ads", "sets"], 5: ["budget", "perSet"], 8: ["ads", "sets", "budget", "perSet"] };
const MIN = { default: 10, webshop: 30 };
const LIVE_STEPS = 5;

export interface WizardProps {
  m: MakerContext;
  preset: "feest" | null;
  tomorrow: string;
  xmasEnd: string;
}

export function Wizard({ m, preset, tomorrow, xmasEnd }: WizardProps) {
  const t = useTranslations("wizard");
  const tg = useTranslations("campaign.goals");
  const router = useRouter();
  const [s, setS] = useState<State>(() => ({
    step: 0,
    strat: preset ?? "vast",
    goal: m.goalType,
    chan: "meta",
    sets: 1,
    ads: 5,
    budget: String(preset ? 30 : m.defaultBudget).replace(".", ","),
    perSet: false,
    from: preset ? tomorrow : "",
    to: preset ? xmasEnd : "",
    ok: {},
  }));
  const [live, setLive] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [fly, setFly] = useState<{ x: number; y: number; say: string; mood: "praat" | "viert" } | null>(null);
  const toast = useToast();
  const timers = useRef<number[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);
  useEffect(() => heading.current?.focus(), [s.step]);

  const W = (p: Partial<State>) => setS((o) => ({ ...o, ...p }));
  const steps = t.raw("steps") as string[];
  const stratTitle = (k: Strategy) => (t.raw(`strategies.${k}`) as string[])[0];
  const special = s.strat !== "vast";
  const minB = m.isWebshop && s.goal === "verkopen" ? MIN.webshop : MIN.default;
  const bN = Number(s.budget.replace(",", ".")) || 0;
  const devs = useMemo(() => {
    const d: Deviation[] = [];
    if (s.ads < 5) d.push("ads");
    if (s.sets > 1) d.push("sets");
    if (bN < minB) d.push("budget");
    if (s.perSet) d.push("perSet");
    return d;
  }, [s.ads, s.sets, s.perSet, bN, minB]);
  const isGoogle = s.chan === "google" && s.step >= 3;
  const start_ = special && s.from ? s.from : tomorrow;
  const campaignName = `${m.short} · ${special ? stratTitle(s.strat) : "Vast"} · ${tg(s.goal)} · ${formatMonthCode(start_)}`;
  const xmas = s.strat === "feest";
  const adNames = xmas ? (t.raw("xmasAds") as string[]) : Array.from({ length: s.ads }, (_, i) => t("adSlot", { n: i + 1 }));
  const done = live >= LIVE_STEPS && !!campaignId;

  /** Laat Dot dit voorstellen: Dot vliegt langs de 9 stappen en vult alles in volgens het playbook. */
  const dotFill = async () => {
    if (fly) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 60) : ms));
    const say = t.raw("dotSay") as string[];
    const base = {
      strat: s.strat === "catalogus" ? "vast" : s.strat,
      goal: m.goalType,
      chan: "meta" as const,
      sets: 1,
      ads: 5,
      perSet: false,
      budget: String(s.strat === "feest" ? 30 : m.defaultBudget).replace(".", ","),
      ok: {},
    };
    for (let i = 0; i < 9; i++) {
      setS((o) => ({ ...o, ...base, step: i }));
      await wait(80);
      const el = document.querySelector('[data-tour="w-choices"], .wz-fields, .wz-schema, .wz-list, .wz-main .as-switchrow') ?? heading.current;
      const r = el?.getBoundingClientRect();
      if (r) setFly({ x: Math.min(window.innerWidth - 80, r.right - 40), y: Math.max(80, r.top - 10), say: say[i], mood: i === 8 ? "viert" : "praat" });
      await wait(i === 8 ? 1200 : 700);
    }
    setFly(null);
    await dotFillAction();
    toast.show({ message: t("dotToast") });
  };

  const goLive = () =>
    start(async () => {
      setError(null);
      const res = await createCampaignAction({
        strategy: s.strat,
        goal: s.goal,
        channel: s.chan,
        sets: s.sets,
        ads: s.ads,
        budget: bN,
        perSet: s.perSet,
        from: special ? s.from || null : null,
        to: special ? s.to || null : null,
        accepted: (Object.keys(s.ok) as Deviation[]).filter((k) => s.ok[k]),
      });
      if (!res.ok) {
        setError(t(`errors.${res.error}`));
        return;
      }
      setCampaignId(res.id);
      for (let i = 1; i <= LIVE_STEPS; i++) timers.current.push(window.setTimeout(() => setLive(i), i * 450));
    });

  const next = () => {
    if (s.step < 8) {
      if (isGoogle) return router.push("/google");
      return W({ step: s.step + 1 });
    }
    if (done) return router.push(`/campagnes/${campaignId}`);
    if (devs.some((d) => !s.ok[d])) return setError(t("errors.afwijking"));
    goLive();
  };

  const warns = (STEP_WARNS[s.step] ?? []).filter((d) => devs.includes(d) && !isGoogle);
  const list: { t: string; v: string; tone: "ink" | "muted" | "act" | "ok"; icon: IconName }[] =
    s.step === 6
      ? adNames.slice(0, s.ads).map((x) => ({ t: x, v: t("imageNeeded"), tone: "ink", icon: "image" }))
      : s.step === 8 && (live > 0 || campaignId)
        ? (t.raw("liveList") as string[]).map((x, i) => ({
            t: x.replace("{n}", String(s.ads)),
            v: i < live ? t("ready") : "",
            tone: i < live ? "ink" : "muted",
            icon: i < live ? "ok" : "hourglass",
          }))
        : s.step === 8
          ? devs.length
            ? devs.map((d) => ({
                t: t("deviation", { what: t(`deviationNames.${d}`) }),
                v: s.ok[d] ? t("confirmed") : t("toConfirm"),
                tone: "act",
                icon: "act",
              }))
            : [{ t: t("allGood"), v: "", tone: "ok", icon: "ok" }]
          : [];

  const choiceStep = s.step <= 2;
  const sum: [string, string, boolean?][] = [
    [t("sum.strategy"), stratTitle(s.strat)],
    [t("sum.goal"), (t.raw(`goals.${s.goal}`) as string[])[0]],
    [t("sum.channel"), (t.raw(`channels.${s.chan}`) as string[])[0]],
    [
      t("sum.period"),
      special
        ? t("periodRange", { from: s.from ? formatDayMonth(s.from) : t("datePlaceholder"), to: s.to ? formatDayMonth(s.to) : t("datePlaceholder") })
        : t("ongoing"),
    ],
    [t("sum.structure"), t("structureText", { sets: s.sets, ads: s.ads })],
    [t("sum.budget"), t("budgetText", { amount: s.budget || "0" })],
    [t("sum.deviations"), String(devs.length), devs.length > 0],
  ];

  return (
    <div className="wz">
      <div data-tour="w-steps" className="wz-steps">
        <Steps label={t("stepsLabel")} steps={steps} current={s.step + 1} reached={done || live ? s.step + 1 : 9} onPick={(n) => !live && W({ step: n - 1 })} />
      </div>

      <section className="wz-main" aria-busy={pending}>
        <div className="wz-top">
          <span>{t("stepOf", { n: s.step + 1 })}</span>
          {m.hasAI && !live ? (
            <button data-tour="w-parel" type="button" className="wz-dot" onClick={dotFill} disabled={!!fly}>
              <DotCharacter size={26} mood="knipoog" />
              {t("dotFill")}
            </button>
          ) : null}
        </div>
        <h2 className="wz-title" ref={heading} tabIndex={-1}>
          {steps[s.step]}
        </h2>

        {isGoogle ? <p className="wz-note wz-note--dashed">{t("googleNote")}</p> : null}

        {choiceStep ? (
          <div data-tour="w-choices">
            <ChoiceCards
              label={steps[s.step]}
              value={s.step === 0 ? s.strat : s.step === 1 ? s.goal : s.chan}
              options={
                s.step === 0
                  ? STRATS.map((k) => {
                      const [title, sub] = t.raw(`strategies.${k}`) as string[];
                      return { value: k, title, sub, disabled: k === "catalogus" };
                    })
                  : s.step === 1
                    ? GOALS.map((k) => {
                        const [title, sub] = t.raw(`goals.${k}`) as string[];
                        return { value: k, title, sub };
                      })
                    : (["meta", "google"] as const).map((k) => {
                        const [title, sub] = t.raw(`channels.${k}`) as string[];
                        return { value: k, title, sub };
                      })
              }
              onChange={(v) =>
                s.step === 0 ? W({ strat: v as Strategy }) : s.step === 1 ? W({ goal: v as CampaignGoal }) : W({ chan: v as "meta" | "google" })
              }
            />
          </div>
        ) : null}

        {s.step === 0 && special ? <p className="wz-note">{t("specialNote")}</p> : null}
        {s.step === 1 && ["volgers", "bereik", "evenement"].includes(s.goal) ? <p className="wz-note">{t("noGoalNote")}</p> : null}

        {s.step === 0 && special ? (
          <div className="wz-fields">
            <Input label={t("from")} type="date" value={s.from} min={tomorrow} onChange={(e) => W({ from: e.target.value })} />
            <Input label={t("to")} type="date" value={s.to} min={s.from || tomorrow} onChange={(e) => W({ to: e.target.value })} />
          </div>
        ) : null}

        {s.step === 3 && !isGoogle ? (
          <div className="wz-schema">
            <span className="wz-node wz-node--root">{t("oneCampaign")}</span>
            <span className="wz-link" aria-hidden="true" />
            <span className="wz-stepper">
              <button type="button" className="wz-round" aria-label={t("lessAdSets")} onClick={() => W({ sets: Math.max(1, s.sets - 1) })}>
                −
              </button>
              <span className={["wz-node", s.sets > 1 ? "wz-node--warn" : "wz-node--root"].join(" ")}>{t("adSets", { n: s.sets })}</span>
              <button type="button" className="wz-round" aria-label={t("moreAdSets")} onClick={() => W({ sets: Math.min(5, s.sets + 1) })}>
                +
              </button>
            </span>
            <span className="wz-link" aria-hidden="true" />
            <span className="wz-stepper">
              <button type="button" className="wz-round" aria-label={t("lessAds")} onClick={() => W({ ads: Math.max(1, s.ads - 1) })}>
                −
              </button>
              <span className={["wz-node", s.ads < 5 && "wz-node--warn"].filter(Boolean).join(" ")}>{t("adsCount", { n: s.ads })}</span>
              <button type="button" className="wz-round" aria-label={t("moreAds")} onClick={() => W({ ads: Math.min(10, s.ads + 1) })}>
                +
              </button>
            </span>
          </div>
        ) : null}

        {s.step === 4 && !isGoogle ? (
          <>
            <div className="wz-fields">
              <Input label={t("region")} value={m.targeting.region} readOnly />
              <Input label={t("countries")} value={m.targeting.countries} readOnly />
              <Input label={t("languages")} value={m.targeting.languages} readOnly />
              <Input label={t("age")} value={m.targeting.age} readOnly />
            </div>
            <details className="wz-details">
              <summary>{t("whyNoInterests")}</summary>
              <p>{t("whyNoInterestsText")}</p>
            </details>
          </>
        ) : null}

        {s.step === 5 && !isGoogle ? (
          <>
            <div className="wz-fields">
              <Input
                label={t("budget")}
                inputMode="decimal"
                value={s.budget}
                invalid={bN < minB}
                aria-invalid={bN < minB}
                help={bN < minB ? undefined : t("budgetHelp", { min: minB })}
                error={bN < minB ? t("budgetLow", { min: minB }) : undefined}
                onChange={(e) => W({ budget: e.target.value })}
              />
            </div>
            <SwitchRow label={t("perSet")} sub={t("perSetSub")} checked={s.perSet} deviates={s.perSet} onChange={(v) => W({ perSet: v })} />
          </>
        ) : null}

        {s.step === 7 && !isGoogle ? (
          <div className="wz-fields">
            <Input label={t("naming.campaign")} value={campaignName} readOnly />
            <Input label={t("naming.adSet")} value={`AS1 · ${formatDashDate(start_)} · start`} readOnly />
            <Input label={t("naming.ad")} value={`A1 · Top · Video · ${xmas ? t("xmasAdName") : t("adNamePlaceholder")}`} readOnly />
            <div className="wz-wide">
              <Input
                label={t("naming.utm")}
                value={`utm_source=meta, utm_medium=paid_social, utm_campaign=${m.slug}-${s.strat}-${s.goal}, utm_content=a1-top-video`}
                readOnly
              />
            </div>
          </div>
        ) : null}

        {warns.map((d) => (
          <PlaybookWarning
            key={d}
            reason={
              <>
                {t(`deviations.${d}`)}
                {s.ok[d] ? <span className="as-muted"> {t("continuing")}</span> : null}
              </>
            }
            onProceed={s.ok[d] ? undefined : () => W({ ok: { ...s.ok, [d]: true } })}
          />
        ))}

        {list.length && !isGoogle ? (
          <ul className="wz-list">
            {list.map((li, i) => (
              <li key={i} className={li.tone === "act" ? "wz-li--act" : li.tone === "ok" ? "wz-li--ok" : li.tone === "muted" ? "wz-li--muted" : undefined}>
                <span>
                  <Icon name={li.icon} size={16} />
                  {li.t}
                </span>
                <span className="wz-v">{li.v}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {done ? (
          <p role="status" style={{ margin: 0, fontWeight: 500 }}>
            {t("sent")}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="am-alert">
            {error}
          </p>
        ) : null}

        <div className="wz-nav">
          <Button variant="secondary" className={s.step === 0 || live > 0 ? "wz-hidden" : undefined} onClick={() => W({ step: Math.max(0, s.step - 1) })}>
            {t("prev")}
          </Button>
          <div className="wz-nav__right">
            {s.step === 8 && campaignId ? (
              <LinkButton href={`/campagnes/${campaignId}/delen`} icon="link">
                {t("preview")}
              </LinkButton>
            ) : null}
            <Button data-tour="w-next" arrow onClick={next} disabled={pending || (live > 0 && !done)}>
              {s.step === 8 ? (done ? t("toCampaign") : t("live")) : t("next")}
            </Button>
          </div>
        </div>
      </section>

      <aside data-tour="w-sum" className="wz-sum" aria-label={t("summary")}>
        <b>{t("summary")}</b>
        {sum.map(([k, v, act]) => (
          <div key={k}>
            <span>{k}</span>
            <span className={act ? "wz-sum--act" : undefined}>{v}</span>
          </div>
        ))}
      </aside>
      {fly ? (
        <div className="dot-fly" style={{ transform: `translate(${fly.x}px, ${fly.y}px)`, left: 0, top: 0 }} aria-hidden="true">
          <DotCharacter size={56} mood={fly.mood} />
          <span className="dot-fly__say">{fly.say}</span>
        </div>
      ) : null}
    </div>
  );
}
