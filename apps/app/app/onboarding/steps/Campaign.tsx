"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { FunnelPhase } from "@adsweet/db";
import { FeedPreview, Input, PhasePill, ReelPreview, StoryPreview, TextButton, formatEuro, useToast } from "@adsweet/ui";
import { upload } from "@/components/ads/upload";
import { PlaybookWarning } from "@/components/ui";
import { firstCampaignAction } from "../actions";
import { ObTip, StepFooter, num, useStepNav, useVM } from "../shared";

const LANG_ADJ: Record<string, string> = { nederlands: "Nederlandstalig", frans: "Franstalig", engels: "Engelstalig", duits: "Duitstalig" };

function useGoalTexts() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const goals = t.raw("goals") as [string, string][];
  const zaakOpts = t.raw("zaakOpts") as string[];
  const g = vm.goal;
  const goal =
    g.type === "verkopen" ? goals[0][0] : g.type === "aanvragen" ? goals[1][0] : g.type === "zaak" ? zaakOpts[g.zaakMode === "aanvragen" ? 0 : 1] : goals[3][0];
  const langs = g.languages
    .split(",")
    .map((l) => LANG_ADJ[l.trim().toLowerCase()] ?? l.trim())
    .filter(Boolean)
    .join(", ");
  const where = [
    g.area === "radius" && g.areaValue ? t("plusKm", { place: g.areaValue, km: g.radius }) : g.areaValue || g.countries,
    langs,
    g.special ? t("ageDefault") : g.age,
  ]
    .filter(Boolean)
    .join(", ");
  const kind = g.type === "verkopen" ? "sales" : g.type === "aanvragen" || (g.type === "zaak" && g.zaakMode === "aanvragen") ? "leads" : "none";
  return { goal, where, kind };
}

// ---------------------------------------------------------------------------
// Stap 8 · Je strategie
// ---------------------------------------------------------------------------

export function StepStrategy() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const { goal, where } = useGoalTexts();
  const b = vm.budget;
  const rows: [string, string, string?][] = [
    [t("sGoal"), goal],
    [t("sArea"), where],
    [t("sBudget"), t("perDay", { amount: formatEuro(b.suggested) }), b.suggested === b.min ? t("isMinimum") : t("minimumIs", { min: formatEuro(b.min) })],
    [t("sStructure"), t("structureV"), t("structureS")],
    [t("sFunnel"), t("funnelV")],
  ];
  return (
    <>
      <h1 className="ob-h1">{t("strategyTitle", { n: vm.firstName })}</h1>
      <dl className="ob-doc">
        {rows.map(([k, v, sub]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              <span>{v}</span>
              {sub ? <span className="as-small as-muted">{sub}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      <figure className="ob-schema" role="img" aria-label={t("structureV")}>
        <span className="wz-node wz-node--root">{t("oneCampaign")}</span>
        <span className="wz-link" aria-hidden="true" />
        <span className="wz-node wz-node--root">{t("oneAdSet")}</span>
        <span className="wz-link" aria-hidden="true" />
        <div className="ob-schema__ads">
          {vm.briefs.map((br, i) => (
            <span key={i} className={`as-phase as-phase--sm as-phase--${br.phase}`}>
              {br.kind === "video" ? t("video") : t("photo")} · {cap(br.phase)}
            </span>
          ))}
        </div>
      </figure>
      <ObTip>{t("funnelTip")}</ObTip>
      <h2 className="ob-h2">{t("briefTitle")}</h2>
      <ol className="ob-briefs">
        {vm.briefs.map((br, i) => (
          <li key={i}>
            <span className="ob-briefs__n">{i + 1}</span>
            <div className="ob-stack">
              <span className="ob-row">
                <PhasePill phase={br.phase} size="sm" />
                <span className="as-small as-muted">{br.kind === "video" ? t("video") : t("photo")}</span>
              </span>
              <span>{br.what}</span>
              <span className="as-small as-muted">
                {t("why")}: {br.why}
              </span>
              <span className="as-small">
                {t("first")}: “{br.first}”
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="ob-twocol">
        <div className="ob-box">
          <b>{t("expect")}</b>
          <span>{t("expectText")}</span>
        </div>
        <div className="ob-box">
          <b>{t("momentsTitle")}</b>
          {vm.moments.length ? vm.moments.map((m) => <span key={m}>{m}</span>) : <span className="as-muted">{t("noMoments")}</span>}
        </div>
      </div>
      <div className="ob-row">
        <TextButton onClick={() => nav.go(4)}>{t("adjust")}</TextButton>
      </div>
      <StepFooter prev={nav.prev} label={t("good")} pending={nav.pending} onNext={() => nav.next()} />
    </>
  );
}

const cap = (p: string) => p[0].toUpperCase() + p.slice(1);

// ---------------------------------------------------------------------------
// Stap 9 · Je eerste campagne
// ---------------------------------------------------------------------------

interface SlotState {
  phase: FunnelPhase;
  kind: "foto" | "video";
  mediaId: string | null;
  mediaName: string | null;
  mediaUrl: string | null;
  text: string;
  headline: string;
  cta: string;
}

export function StepFirstCampaign() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const toast = useToast();
  const { kind } = useGoalTexts();
  const ctas = t.raw("ctas") as string[];
  const ctaFor = (p: FunnelPhase) =>
    kind === "sales"
      ? p === "bottom"
        ? ctas[0]
        : ctas[1]
      : vm.goal.type === "zaak"
        ? ctas[3]
        : kind === "leads"
          ? p === "bottom"
            ? ctas[2]
            : ctas[1]
          : ctas[1];
  const headline = vm.headline;
  const [slots, setSlots] = useState<SlotState[]>(() => {
    if (vm.draft?.slots.length) return vm.draft.slots.map((s) => ({ ...s }));
    const photos = vm.images.filter((m) => m.kind === "foto");
    const videos = vm.images.filter((m) => m.kind === "video");
    let pi = 0;
    let vi = 0;
    return vm.briefs.map((b) => {
      const m = b.kind === "video" ? videos[vi++] : photos[pi++];
      return {
        phase: b.phase,
        kind: b.kind,
        mediaId: m?.id ?? null,
        mediaName: m?.name ?? null,
        mediaUrl: m?.url ?? null,
        text: b.first,
        headline,
        cta: ctaFor(b.phase),
      };
    });
  });
  const [sel, setSel] = useState(0);
  const [budget, setBudget] = useState(String(vm.draft?.budget ?? vm.budget.suggested));
  const [accepted, setAccepted] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const bN = num(budget);
  const low = bN < vm.budget.min;
  const s = slots[sel];
  const setSlot = (i: number, p: Partial<SlotState>) => setSlots((x) => x.map((y, j) => (j === i ? { ...y, ...p } : y)));
  const onUpload = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    try {
      const u = await upload(files[0]);
      setSlot(i, { mediaId: u.id, mediaName: u.name, mediaUrl: u.url, kind: u.kind });
    } catch {
      toast.show({ message: t("uploadError") });
    }
  };
  const content = {
    page: vm.orgName,
    pageInitial: vm.orgName.slice(0, 1).toUpperCase(),
    pageColor: vm.color,
    text: s?.text ?? "",
    headline: s?.headline,
    cta: s?.cta ?? "",
  };
  const media = (ratio: string) => ({ src: s?.mediaUrl ?? undefined, kind: s?.kind, placeholder: `${s?.kind === "video" ? t("video") : t("photo")} ${ratio}` });
  const placements = t.raw("placements") as string[];

  return (
    <>
      <header className="ob-header">
        <h1 className="ob-h1">{t("firstTitle")}</h1>
        <p className="ob-lead">{t("firstLead")}</p>
      </header>
      <div className="ob-slots">
        {slots.map((sl, i) => {
          const empty = !sl.mediaId;
          return (
            <article key={i} className={["ob-slot", sel === i && "ob-slot--on"].filter(Boolean).join(" ")}>
              <button
                type="button"
                className={["ob-slot__thumb", empty && "ob-slot__thumb--empty", "as-hatch"].filter(Boolean).join(" ")}
                onClick={() => setSel(i)}
                aria-label={t("previewOf", { n: i + 1 })}
                aria-pressed={sel === i}
              >
                {sl.mediaUrl && sl.kind === "foto" ? (
                  <img src={sl.mediaUrl} alt="" />
                ) : empty ? (
                  t("empty")
                ) : (
                  `${sl.kind === "video" ? t("video") : t("photo")} · ${t("fromSite")}`
                )}
              </button>
              <div className="ob-stack">
                <span className="ob-row">
                  <b>{i + 1}</b>
                  <PhasePill phase={sl.phase} size="sm" />
                  <span className="as-small as-muted">{sl.kind === "video" ? t("video") : t("photo")}</span>
                </span>
                {!empty || sl.kind === "foto" ? (
                  <>
                    <span className="ob-slot__text">{sl.text}</span>
                    <span className="as-small as-muted">
                      {t("headline")}: {sl.headline} · {t("cta")}: {sl.cta}
                    </span>
                  </>
                ) : (
                  <span className="as-small">
                    {t("noVideo")}{" "}
                    <Link className="as-link" href="/academy">
                      {t("howFilm")}
                    </Link>
                  </span>
                )}
                <div className="ob-row as-small">
                  <label className="as-textbtn ob-file">
                    {t("upload")}
                    <input type="file" accept="image/*,video/*" onChange={(e) => onUpload(i, e.target.files)} />
                  </label>
                  {vm.images.length ? <TextButton onClick={() => setPicking(picking === i ? null : i)}>{t("choose")}</TextButton> : null}
                  {vm.hasAI ? <span className="as-muted">{empty && sl.kind === "video" ? t("script") : t("aiCost")}</span> : null}
                </div>
                {picking === i ? (
                  <div className="ob-imggrid">
                    {vm.images.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="ob-imgtile"
                        aria-label={m.name}
                        onClick={() => {
                          setSlot(i, { mediaId: m.id, mediaName: m.name, mediaUrl: m.url, kind: m.kind });
                          setPicking(null);
                        }}
                      >
                        {m.url ? <img src={m.url} alt="" /> : <span className="as-hatch" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <div className="ob-group">
        <div className="ob-grid">
          <Input
            label={t("budget")}
            prefix="€"
            inputMode="decimal"
            value={budget}
            invalid={low}
            help={low ? undefined : t("budgetHelp", { s: formatEuro(vm.budget.suggested), m: formatEuro(vm.budget.min) })}
            error={low ? t("budgetLow", { m: formatEuro(vm.budget.min) }) : undefined}
            onChange={(e) => {
              setBudget(e.target.value);
              setAccepted(false);
            }}
          />
        </div>
        {low && !accepted ? <PlaybookWarning reason={t("budgetWarn")} onProceed={() => setAccepted(true)} /> : null}
      </div>
      {s ? (
        <div className="ob-group">
          <span className="ob-label">{t("previewOf", { n: sel + 1 })}</span>
          <div className="as-previews">
            <FeedPreview c={{ ...content, media: media("4:5") }} caption={placements[0]} width={200} />
            <StoryPreview c={{ ...content, media: media("9:16") }} caption={placements[1]} width={140} />
            <ReelPreview c={{ ...content, media: media("9:16") }} caption={placements[2]} width={140} />
          </div>
          <span className="as-small">
            {t("extras")} <span className="as-muted">{t("extrasWhy")}</span>
          </span>
        </div>
      ) : null}
      <StepFooter
        prev={nav.prev}
        label={t("approve")}
        pending={nav.pending}
        disabled={low && !accepted}
        onNext={() =>
          nav.next(async () => {
            const res = await firstCampaignAction({
              budget: bN,
              accepted,
              slots: slots.map(({ phase, kind: k, mediaId, text, headline: h, cta }) => ({ phase, kind: k, mediaId, text, headline: h, cta })),
            });
            if (!res.ok) toast.show({ message: t("saveError") });
            return res.ok;
          })
        }
      />
    </>
  );
}
