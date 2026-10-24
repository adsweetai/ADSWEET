"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionCard,
  AdCard,
  ASSISTANT_NAME,
  Avatar,
  Button,
  ChoiceCards,
  CountUp,
  CreditsMeter,
  DotCharacter,
  EmptyState,
  ErrorState,
  EuroTile,
  Eyebrow,
  FeedPreview,
  FunnelBar,
  Input,
  Loader,
  Loading,
  Logo,
  PhasePill,
  PlanGate,
  ProgressBox,
  ReelPreview,
  Reveal,
  Segmented,
  Select,
  Steps,
  StoryPreview,
  SweetMoment,
  SwitchRow,
  Tabs,
  Term,
  TermCard,
  TextButton,
  TrialBar,
  useToast,
  Accordion,
  type DotMood,
  type PreviewContent,
} from "@adsweet/ui";
import { ExampleTag, GatePanel, Label, PlaybookTip, PlaybookWarning, Proposal, Status } from "@/components/ui";

type Mode = "beide" | "light" | "dark";

export function Showcase() {
  const t = useTranslations("onderdelen");
  const [mode, setMode] = useState<Mode>("beide");
  const themes = mode === "beide" ? (["light", "dark"] as const) : ([mode] as const);
  return (
    <div className="ov">
      <header className="ov-head" data-theme={mode === "dark" ? "dark" : "light"}>
        <div className="ov-head__left">
          <Logo />
          <span className="as-small">{t("sub")}</span>
        </div>
        <Segmented
          label={t("title")}
          value={mode}
          onChange={setMode}
          options={(["beide", "light", "dark"] as Mode[]).map((m) => ({ value: m, label: t(`modes.${m}`) }))}
        />
      </header>
      <main className="ov-grid">
        {themes.map((th) => (
          <Column key={th} theme={th} />
        ))}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ov-section">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  );
}

function Column({ theme }: { theme: "light" | "dark" }) {
  const t = useTranslations("onderdelen");
  const tu = useTranslations("ui");
  const toast = useToast();
  const [sw, setSw] = useState({ cbo: true, muziek: false, tekst: false });
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [choice, setChoice] = useState<"verkopen" | "aanvragen" | "zaak" | "anders">("verkopen");
  const [step, setStep] = useState(3);
  const [tab, setTab] = useState("0");
  const [budget, setBudget] = useState("20");
  const [budgetOk, setBudgetOk] = useState(false);
  const [a4, setA4] = useState<"open" | "off" | "raised" | "later">("open");
  const [sweetKey, setSweetKey] = useState(0);
  const [dot, setDot] = useState<"praat" | "denkt" | "rust">("praat");
  const [revealKey, setRevealKey] = useState(0);

  const steps = t.raw("steps") as string[];
  const tabs = t.raw("tabs") as [string, string][];
  const minutes = Math.round((8 * (11 - step)) / 10);
  const budgetNum = parseFloat(budget.replace(",", ".")) || 0;
  const budgetLow = budgetNum < 30;

  const preview: PreviewContent = {
    page: "Atelier Noor",
    pageInitial: "N",
    pageColor: "roos",
    text: t("previewText"),
    headline: t("previewHead"),
    cta: t("previewCta"),
    media: { placeholder: t("previewFeedMedia") },
  };

  const rows: [string, string, string, string, number, number, number, string, string, "winnaar" | "geen" | "verliezer" | "vroeg"][] = [
    ["A1", "Kaars wordt aangestoken", t("video"), "Top", 82, 5, 290, "3,54", "€16,40", "winnaar"],
    ["A2", "Zo gieten we ze", t("video"), "Middle", 71, 4, 232, "3,27", "€17,75", "winnaar"],
    ["A3", "Geschenkdoos", t("photo"), "Bottom", 48, 2, 116, "2,42", "€24,00", "geen"],
    ["A4", "Sfeerbeeld woonkamer", t("photo"), "Top", 72, 0, 0, "0", t("none"), "verliezer"],
    ["A5", "Klantreview", t("photo"), "Middle", 7, 0, 0, "0", t("none"), "vroeg"],
  ];

  const switchRow = (key: "cbo" | "muziek" | "tekst", label: string, sub: string) => {
    const on = sw[key];
    const deviates = key === "cbo" ? !on : on;
    return (
      <SwitchRow
        key={key}
        label={label}
        sub={sub}
        checked={on}
        deviates={deviates}
        onChange={(v) => {
          setSw({ ...sw, [key]: v });
          setAccepted({ ...accepted, [key]: false });
        }}
      >
        {deviates && !accepted[key] ? (
          <PlaybookWarning reason={key === "cbo" ? t("warnCbo") : t("warnExtra")} onProceed={() => setAccepted({ ...accepted, [key]: true })} />
        ) : null}
      </SwitchRow>
    );
  };

  return (
    <div data-theme={theme} className="ov-col">
      <div className="ov-colhead">
        <h2 className="ov-coltitle">{theme === "light" ? t("light") : t("dark")}</h2>
        <span className="as-small">{t("ground", { hex: theme === "light" ? "#EAE8E3" : "#111110" })}</span>
      </div>

      <Section title={t("s01")}>
        <div className="ov-card">
          <div className="ov-row ov-wrap" style={{ gap: 32 }}>
            <div className="ov-logobox">
              <Logo height={56} />
            </div>
            <div className="ov-stack" style={{ gap: 18 }}>
              <div className="ov-stack" style={{ gap: 6, alignItems: "flex-start" }}>
                <Logo height={19} />
                <span className="as-small">{t("logoDesk")}</span>
              </div>
              <div className="ov-stack" style={{ gap: 6, alignItems: "flex-start" }}>
                <Logo height={17} />
                <span className="as-small">{t("logoMob")}</span>
              </div>
            </div>
          </div>
          <div className="ov-lines">
            {(t.raw("logoRules") as string[]).map((r, i) => (
              <div key={r}>
                <span>{r}</span>
                <span className="as-small">{(t.raw("logoRulesSide") as string[])[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ov-card">
          <div className="ov-row ov-between">
            <h3 className="as-h-card">{t("iconTitle")}</h3>
            <span className="as-small">{t("iconSub")}</span>
          </div>
          <div className="ov-row ov-wrap" style={{ alignItems: "flex-end", gap: 24 }}>
            {[
              [1024, 112, 25],
              [512, 80, 18],
              [180, 60, 13],
              [32, 32, 6],
              [16, 16, 3],
            ].map(([n, s, r]) => (
              <figure key={n} className="ov-stack" style={{ margin: 0, gap: 8 }}>
                <img src={`/icon/app-icon-${n}.png`} alt={`App-icoon ${n}`} width={s} height={s} style={{ borderRadius: r, display: "block" }} />
                <figcaption className="as-small" style={{ fontSize: 12.5 }}>
                  {n}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t("s02")}>
        <div className="ov-card">
          <div className="ov-swatches">
            {Object.entries(t.raw("swatchUse") as Record<string, string>).map(([n, u]) => (
              <div key={n} className="ov-swatch">
                <div style={{ height: 56, background: `var(--${n})`, borderBottom: "1px solid var(--line)" }} />
                <div className="ov-stack" style={{ padding: "10px 12px 12px", gap: 2 }}>
                  <b style={{ fontWeight: 500 }}>{n}</b>
                  <span className="as-small" style={{ fontSize: 12.5 }}>
                    {u}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="ov-row ov-between ov-top">
            <span className="ov-row" style={{ gap: 10 }}>
              <span className="ov-robijn" />
              {t("robijn")}
            </span>
            <span className="as-small">{t("robijnUse")}</span>
          </div>
        </div>
        <div className="ov-card" style={{ gap: 4 }}>
          <h3 className="as-h-card" style={{ marginBottom: 12 }}>
            {t("statusTitle")}
          </h3>
          {(["ok", "warn", "act"] as const).map((k) => (
            <div key={k} className="ov-row ov-between ov-top" style={{ padding: "12px 0" }}>
              <Status kind={k} />
            </div>
          ))}
        </div>
        <div className="ov-card">
          <h3 className="as-h-card">{t("seriesTitle")}</h3>
          <div className="ov-swatches">
            {Object.entries(t.raw("seriesUse") as Record<string, string>).map(([n, u]) => (
              <div key={n} className={`ov-series as-bg--${n}`}>
                <b style={{ fontWeight: 500 }}>{n}</b>
                <span>{u}</span>
              </div>
            ))}
          </div>
          <div className="ov-lines">
            <div>
              <span className="as-small">{t("funnel")}</span>
              <span className="ov-row" style={{ gap: 6 }}>
                <PhasePill phase="top" />
                <PhasePill phase="middle" />
                <PhasePill phase="bottom" />
              </span>
            </div>
            <div>
              <span className="as-small">{t("kinds")}</span>
              <span className="ov-row ov-wrap" style={{ gap: 14, fontSize: 13 }}>
                {(
                  [
                    ["Webshop", "W", "roos"],
                    ["Dienstverlener", "D", "staal"],
                    ["Lokale zaak", "L", "tarwe"],
                    ["Zelfstandige", "Z", "lavendel"],
                  ] as const
                ).map(([n, i, c]) => (
                  <span key={n} className="ov-row" style={{ gap: 8 }}>
                    <Avatar initial={i} color={c} size={26} />
                    {n}
                  </span>
                ))}
              </span>
            </div>
            <div>
              <span className="as-small">{t("channels")}</span>
              <span className="ov-row ov-wrap" style={{ gap: 16, fontSize: 13 }}>
                <span className="ov-row" style={{ gap: 8 }}>
                  <span className="ov-chan" style={{ borderTop: "2px solid var(--ink)" }} />
                  Meta
                </span>
                <span className="ov-row" style={{ gap: 8 }}>
                  <span className="ov-chan" style={{ borderTop: "2px dashed var(--ink-muted)" }} />
                  Google Ads
                </span>
                <span className="ov-row" style={{ gap: 8 }}>
                  <span className="ov-chan" style={{ borderTop: "2px solid var(--staal)" }} />
                  Shopify
                </span>
                <span className="ov-row" style={{ gap: 8 }}>
                  <span className="ov-chan" style={{ borderTop: "2px solid var(--salie)" }} />
                  Google Analytics
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="ov-rules">
          {(t.raw("colorRules") as string[]).map((r) => (
            <div key={r}>{r}</div>
          ))}
        </div>
      </Section>

      <Section title={t("s03")}>
        <div className="ov-card" style={{ gap: 0 }}>
          <p className="as-small" style={{ margin: "0 0 8px", fontSize: 12.5 }}>
            {t("typeHero")}
          </p>
          <p className="ov-hero">
            {t("typeHeroText")}
            <span>
              Hit the <span className="ov-sweet">sweet</span> spot.
            </span>
          </p>
          {(t.raw("typeRows") as [string, string][]).map(([txt, meta], i) => (
            <div key={txt} className="ov-typerow">
              {i === 6 ? (
                <Eyebrow>{txt}</Eyebrow>
              ) : (
                <span
                  style={
                    [
                      { fontSize: 40, fontWeight: 500, lineHeight: 1, letterSpacing: "-.035em" },
                      { fontSize: 34, fontWeight: 500, lineHeight: 1.1, letterSpacing: "-.03em" },
                      { fontSize: 30, fontWeight: 500, lineHeight: 1.1, letterSpacing: "-.03em" },
                      { fontSize: 20, fontWeight: 500, letterSpacing: "-.015em" },
                      { fontSize: 17 },
                      {},
                    ][i]
                  }
                >
                  {txt}
                </span>
              )}
              <small className="as-small" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
                {meta}
              </small>
            </div>
          ))}
          <div className="ov-typerow">
            <span className="as-num">{t("typeNumbers")}</span>
            <small className="as-small" style={{ fontSize: 12.5 }}>
              tabular-nums
            </small>
          </div>
        </div>
      </Section>

      <Section title={t("s04")}>
        <div className="ov-card" style={{ gap: 22 }}>
          <div className="ov-row ov-wrap" style={{ gap: "14px 18px" }}>
            <Button size="site">{t("btnStart")}</Button>
            <Button>{t("btnApprove")}</Button>
            <Button variant="secondary">{t("btnAdjust")}</Button>
            <TextButton arrow>{t("btnAudit")}</TextButton>
          </div>
          <p className="as-small" style={{ margin: 0 }}>
            {t("btnNote")}
          </p>
          <div className="ov-fields ov-top">
            <Input label={t("fSite")} placeholder={t("fSitePh")} />
            <Input label={t("fAov")} prefix="€" inputMode="decimal" defaultValue="58" />
            <Select label={t("fLang")} options={(t.raw("langs") as string[]).map((l) => ({ value: l, label: l }))} />
          </div>
          <div className="ov-top" style={{ paddingTop: 8 }}>
            {switchRow("cbo", t("swCbo"), t("swCboSub"))}
            {switchRow("muziek", t("swMusic"), t("swExtraSub"))}
            {switchRow("tekst", t("swText"), t("swExtraSub"))}
          </div>
          <div className="ov-stack" style={{ gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t("choicesLabel")}</span>
            <ChoiceCards
              label={t("choicesAria")}
              value={choice}
              onChange={setChoice}
              options={(["verkopen", "aanvragen", "zaak", "anders"] as const).map((v, i) => {
                const [title, sub] = (t.raw("choices") as [string, string][])[i];
                return { value: v, title, sub };
              })}
            />
          </div>
        </div>
        <div className="ov-two">
          <div className="ov-card" style={{ padding: 24, gap: 14 }}>
            <div className="ov-row ov-between" style={{ alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t("stepsLabel")}</span>
              <span className="as-small" style={{ fontSize: 12.5 }}>
                {tu("minutesLeft", { n: minutes })}
              </span>
            </div>
            <Steps label={t("stepsLabel")} steps={steps} current={step} reached={11} onPick={setStep} />
          </div>
          <div className="ov-stack" style={{ gap: 16 }}>
            <div className="ov-card" style={{ padding: "24px 24px 20px", gap: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t("tabsLabel")}</span>
              <Tabs label={t("tabsLabel")} value={tab} onChange={setTab} items={tabs.map(([l], i) => ({ value: String(i), label: l }))} />
              <p className="as-small" style={{ margin: 0, fontSize: 14, minHeight: 42 }}>
                {tabs[Number(tab)][1]}
              </p>
            </div>
            <Accordion defaultOpen={0} items={(t.raw("faq") as [string, string][]).map(([q, a]) => ({ q, a }))} />
          </div>
        </div>
        <div className="ov-card ov-flush">
          <div className="ov-row ov-between" style={{ padding: "18px 24px" }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t("tableTitle")}</span>
            <ExampleTag />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="as-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  {(t.raw("cols") as string[]).map((c, i) => (
                    <th key={c} className={i === 0 || i === 6 ? "as-left" : undefined}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([code, name, soort, fase, sp, sa, rev, roas, cpa, l]) => (
                  <tr key={code}>
                    <td>
                      <span className="as-table__name">
                        {code} · {name}
                      </span>
                      <span className="as-table__sub">
                        {soort} · {fase}
                      </span>
                    </td>
                    <td>€{sp}</td>
                    <td>{sa}</td>
                    <td>€{rev}</td>
                    <td>{roas}</td>
                    <td>{cpa}</td>
                    <td className="as-left">
                      <Label kind={l} size="md" />
                    </td>
                  </tr>
                ))}
                <tr className="as-total">
                  <td>{t("total")}</td>
                  <td>€280</td>
                  <td>11</td>
                  <td>€638</td>
                  <td>2,28</td>
                  <td>€25,45</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title={t("s05")}>
        <div className="ov-card">
          <div className="ov-row ov-wrap" style={{ gap: 8 }}>
            <Status kind="ok" />
            <Status kind="warn" />
            <Status kind="act" />
          </div>
          <div className="ov-row ov-wrap ov-top" style={{ gap: 8, paddingTop: 20 }}>
            {(["winnaar", "geen", "verliezer", "vroeg", "rapport"] as const).map((k) => (
              <Label key={k} kind={k} />
            ))}
          </div>
          <div className="ov-row ov-wrap ov-top" style={{ gap: "12px 28px", paddingTop: 20 }}>
            <Proposal robijn={theme === "light"} />
            <Proposal />
            <span className="as-small">{t("proposalNote")}</span>
          </div>
        </div>
      </Section>

      <Section title={t("s06")}>
        <div className="ov-card" style={{ gap: 14 }}>
          <div style={{ maxWidth: 320 }}>
            <Input
              label={t("budgetLabel")}
              prefix="€"
              inputMode="numeric"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                setBudgetOk(false);
              }}
              invalid={budgetLow}
              error={budgetLow ? t("budgetLow") : undefined}
              help={budgetLow ? undefined : t("budgetOk")}
            />
          </div>
          {budgetLow && !budgetOk ? <PlaybookWarning reason={t("warnBudget")} onProceed={() => setBudgetOk(true)} /> : null}
        </div>
        <div className="ov-two">
          <PlaybookTip>{t("tipBudget")}</PlaybookTip>
          <div className="ov-card" style={{ padding: 18, gap: 10, borderRadius: 14 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-muted)" }}>{t("termCaption")}</span>
            <p style={{ margin: 0, fontSize: 14.5 }}>
              {t("termBefore")}{" "}
              <Term
                explanation={{
                  title: "ROAS",
                  text: t("termRoasText"),
                  exampleLabel: tu("inYourNumbers"),
                  example: t("termRoasEx"),
                  lesson: { label: t("termRoasLesson"), href: "/academy" },
                }}
              >
                ROAS
              </Term>{" "}
              {t("termAfter")}
            </p>
            <TermCard
              title={t("termBe")}
              text={t("termBeText")}
              exampleLabel={tu("inYourNumbers")}
              example={t("termBeEx")}
              lesson={{ label: t("termBeLesson"), href: "/academy" }}
            />
          </div>
        </div>
      </Section>

      <Section title={t("s07")}>
        {a4 === "open" ? (
          <ActionCard
            proposalLabel={tu("proposal")}
            robijn
            badge={{ kind: "act", label: tu("status.act") }}
            title={t("a4Title")}
            stats={[
              { label: t("spent"), value: "€72" },
              { label: t("sales"), value: "0" },
              { label: t("limit"), value: "€69,60" },
            ]}
            text={t("a4Text")}
            explain={t.rich("a4Explain", { term: (c) => <span className="as-term">{c}</span> })}
            why={{
              label: tu("why"),
              content: (
                <>
                  <span>{t("a4Why1")}</span>
                  <span>{t("a4Why2")}</span>
                  <a className="as-link" href="/academy">
                    {t("a4WhyLesson")}
                  </a>
                </>
              ),
            }}
            tip={tu("tipPrefix", { tip: t("a4Tip") })}
            primary={{
              label: t("a4Off"),
              onClick: () => {
                setA4("off");
                toast.show({ message: t("toastOff"), undo: () => setA4("open") });
              },
            }}
            later={{
              label: tu("later"),
              onClick: () => {
                setA4("later");
                toast.show({ message: t("a4Later"), undo: () => setA4("open") });
              },
            }}
          />
        ) : null}
        {a4 === "off" ? (
          <ActionCard
            proposalLabel={tu("proposal")}
            robijn
            title={t("a4bTitle")}
            explain={t("a4bExplain")}
            why={{ label: tu("why"), onClick: () => undefined }}
            primary={{
              label: t("a4bRaise"),
              onClick: () => {
                setA4("raised");
                toast.show({ message: t("toastRaised"), undo: () => setA4("off") });
              },
            }}
            later={{ label: tu("later"), onClick: () => setA4("later") }}
          />
        ) : null}
        {a4 === "raised" || a4 === "later" ? (
          <div className="ov-row ov-between ov-done">
            <span className="as-muted">{a4 === "raised" ? t("a4Done") : t("a4Later")}</span>
            <TextButton onClick={() => setA4("open")}>{t("replay")}</TextButton>
          </div>
        ) : null}
        <ActionCard
          proposalLabel={tu("proposal")}
          badge={{ kind: "warn", label: tu("status.warn") }}
          title={t("musicTitle")}
          warning={<PlaybookWarning reason={t("warnExtra")} />}
          primary={{ label: t("musicOff") }}
          secondary={[{ label: t("musicKeep") }]}
        />
        <p className="as-small" style={{ margin: 0 }}>
          {t("cardsNote")}
        </p>
      </Section>

      <Section title={t("s08")}>
        <EuroTile
          blocks={[
            { label: t("spent"), value: "€280" },
            { label: t("sales"), value: "11" },
            { label: t("revenue"), value: "€638" },
            { label: <span className="as-term">ROAS</span>, value: "2,28" },
          ]}
          caption={t("tileLisa")}
          tag={tu("example")}
          note={t("breakEven")}
          status={{ kind: "warn", label: tu("status.warn") }}
        />
        <EuroTile
          minBlock={130}
          blocks={[
            { label: t("spent"), value: "€105" },
            { label: t("leads"), value: "5" },
            { label: <span className="as-term">{t("cpl")}</span>, value: "€21,00" },
          ]}
          caption={t("tileTom")}
          tag={tu("example")}
          note={t("goalTom")}
          status={{ kind: "warn", label: tu("status.warn") }}
        />
        <div className="ov-two">
          <AdCard
            name="A1 · Kaars wordt aangestoken"
            kind="video"
            phase="top"
            label={{ kind: "winnaar", text: tu("labels.winnaar") }}
            metrics={[
              { k: "ROAS", v: "3,54" },
              { k: t("perSale"), v: "€16,40" },
            ]}
          />
          <AdCard
            name="A4 · Sfeerbeeld woonkamer"
            kind="foto"
            phase="top"
            label={{ kind: "verliezer", text: tu("labels.verliezer") }}
            metrics={[
              { k: t("spent"), v: "€72" },
              { k: t("sales"), v: "0" },
            ]}
          />
        </div>
        <div className="ov-two">
          <div className="ov-stack" style={{ gap: 8 }}>
            <span className="as-small">{t("funnelLisa")}</span>
            <FunnelBar counts={{ top: 2, middle: 2, bottom: 1 }} format={(n) => tu("ads", { count: n })} missing={tu("missing")} />
          </div>
          <div className="ov-stack" style={{ gap: 8 }}>
            <span className="as-small">{t("funnelMissing")}</span>
            <FunnelBar counts={{ top: 3, middle: 2, bottom: 0 }} format={(n) => tu("ads", { count: n })} missing={tu("missing")} />
          </div>
        </div>
      </Section>

      <Section title={t("s09")}>
        <div className="as-previews">
          <FeedPreview c={preview} caption={tu("placements.feed")} />
          <StoryPreview c={{ ...preview, media: { placeholder: t("previewTallMedia") } }} caption={tu("placements.stories")} />
          <ReelPreview c={{ ...preview, text: t("previewShort"), media: { placeholder: t("previewTallMedia") } }} caption={tu("placements.reels")} />
        </div>
        <p className="as-small" style={{ margin: 0 }}>
          {t("previewNote")}
        </p>
      </Section>

      <Section title={t("s10")}>
        <div className="ov-card" style={{ padding: 24, gap: 10 }}>
          <CreditsMeter left={18} total={50} title={t("credits")} aside={t("creditsUsed")} note={t("creditsNote")} label={t("creditsAria")} />
        </div>
        <div className="ov-flushbox">
          <TrialBar text={t("trial")} link={{ label: t("trialManage"), href: "#" }} />
          <TrialBar warn text={t("trialLate")} link={{ label: t("trialManage"), href: "#" }} />
          <div className="as-small" style={{ padding: "8px 16px", fontSize: 12.5 }}>
            {t("trialNote")}
          </div>
        </div>
        <div className="ov-card" style={{ padding: 24, gap: 10 }}>
          <ProgressBox
            title={tu("stepOf", { a: step, b: 11 })}
            aside={tu("minutesLeft", { n: minutes })}
            value={step}
            max={11}
            label={t("progressAria")}
            note={t("progressNote")}
          />
        </div>
      </Section>

      <Section title={t("s11")}>
        <div className="ov-card ov-row ov-between" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: 14 }}>{t("toastDemo")}</span>
          <Button variant="secondary" onClick={() => toast.show({ message: t("toastOff"), undo: () => undefined })}>
            {t("toastShow")}
          </Button>
        </div>
        <div className="ov-two">
          <div className="ov-stack" style={{ gap: 6 }}>
            <EmptyState text={t("empty")} action={<Button arrow={false}>{t("emptyCta")}</Button>} />
            <span className="as-small" style={{ fontSize: 12.5, textAlign: "center" }}>
              {t("emptyCaption")}
            </span>
          </div>
          <div className="ov-stack" style={{ gap: 16 }}>
            <ErrorState badge={tu("status.act")} title={t("errTitle")} text={t("errText")} action={<Button variant="secondary">{t("errRetry")}</Button>} />
            <div className="as-state">
              <Loading>{t("loading")}</Loading>
              <span className="as-small" style={{ fontSize: 12.5 }}>
                {t("loadingCaption")}
              </span>
            </div>
          </div>
        </div>
        <div className="ov-gatebox">
          <PlanGate panel={<GatePanel plan="Pro" text={t("gateText")} />}>
            <div className="ov-stack" style={{ padding: 24, gap: 16 }}>
              <span className="as-h-page">Studio</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="as-hatch" style={{ aspectRatio: "4 / 5", borderRadius: 10 }} />
                ))}
              </div>
            </div>
          </PlanGate>
        </div>
        <div className="ov-card" style={{ padding: 24, gap: 14 }}>
          <SweetMoment replayKey={sweetKey}>{t("sweet")}</SweetMoment>
          <div className="ov-row" style={{ alignItems: "baseline", gap: 10 }}>
            <span className="ov-sweetnum">
              <CountUp key={sweetKey} from={8} to={11} />
            </span>
            <span className="as-muted">{t("sweetUnit")}</span>
          </div>
          <div className="ov-row ov-between ov-wrap" style={{ gap: 10 }}>
            <span className="as-small" style={{ fontSize: 12.5 }}>
              {t("sweetCaption")}
            </span>
            <TextButton onClick={() => setSweetKey((k) => k + 1)}>{t("sweetReplay")}</TextButton>
          </div>
        </div>
      </Section>

      <Section title={t("s12", { name: ASSISTANT_NAME })}>
        <div className="ov-dotstage">
          <div className="ov-dotintro">
            <span className="as-small">{t("dotIntro")}</span>
            <div className="ov-row ov-wrap" style={{ gap: 8 }}>
              <button type="button" className="as-pill" aria-pressed={dot === "praat"} onClick={() => setDot("praat")}>
                {t("dotTalk")}
              </button>
              <button type="button" className="as-pill" aria-pressed={dot === "denkt"} onClick={() => setDot("denkt")}>
                {t("dotThink")}
              </button>
              <button type="button" className="as-pill" aria-pressed={dot === "rust"} onClick={() => setDot("rust")}>
                {t("dotRest")}
              </button>
            </div>
          </div>
          {dot === "praat" ? (
            <div role="status" className="ov-balloon">
              <span style={{ fontSize: 14.5 }}>{t("dotSays")}</span>
              <a className="as-link" href="#" style={{ alignSelf: "flex-start", fontSize: 13.5 }}>
                {t("dotSee")}
              </a>
            </div>
          ) : null}
          {dot === "denkt" ? (
            <div role="status" className="ov-balloon ov-row" style={{ gap: 12, fontSize: 14 }}>
              <Loader />
              <span>{t("dotThinking")}</span>
            </div>
          ) : null}
          <button type="button" aria-label={t("dotOpen", { name: ASSISTANT_NAME })} className="ov-dotbtn">
            <DotCharacter size={64} mood={dot === "praat" ? "praat" : dot === "denkt" ? "denkt" : "rust"} />
          </button>
          <figure className="ov-dotmob">
            <DotCharacter size={54} />
            <figcaption className="as-small" style={{ fontSize: 12 }}>
              {t("dotMobile")}
            </figcaption>
          </figure>
        </div>
        <div className="ov-row ov-wrap" style={{ gap: 20 }}>
          {(["rust", "praat", "denkt", "blij", "knipoog", "viert"] as DotMood[]).map((m) => (
            <figure key={m} className="ov-stack" style={{ margin: 0, alignItems: "center", gap: 6 }}>
              <DotCharacter size={56} mood={m} />
              <figcaption className="as-small" style={{ fontSize: 12 }}>
                {t(`moods.${m}`)}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="ov-rules">
          {(t.raw("dotRules") as string[]).map((r) => (
            <div key={r}>{r.replace("{name}", ASSISTANT_NAME)}</div>
          ))}
        </div>
      </Section>

      <Section title={t("s13")}>
        <div className="ov-card" style={{ padding: 24, gap: 18 }}>
          <div className="ov-row ov-between ov-wrap" style={{ gap: 12 }}>
            <span className="as-small">{t("motionNote")}</span>
            <TextButton onClick={() => setRevealKey((k) => k + 1)}>{t("motionPlay")}</TextButton>
          </div>
          <div key={revealKey} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {[
              [t("spent"), "€280"],
              [t("sales"), "11"],
            ].map(([k, v], i) => (
              <Reveal key={k} index={i} className="ov-revealbox">
                <span className="as-small" style={{ display: "block", fontSize: 12.5 }}>
                  {k}
                </span>
                <span style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.03em" }}>{v}</span>
              </Reveal>
            ))}
            <Reveal index={2} className="ov-revealbox">
              <span className="as-small" style={{ display: "block", fontSize: 12.5 }}>
                {t("revenue")}
              </span>
              <span style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.03em" }}>
                <CountUp to={638} format={(n) => `€${n}`} />
              </span>
            </Reveal>
          </div>
        </div>
        <div className="ov-lines ov-motion">
          {(t.raw("motionRows") as [string, string][]).map(([a, b]) => (
            <div key={a}>
              <span>{a}</span>
              <span className="as-muted">{b}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
