"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, FeedPreview, Icon, Input, Loading, ReelPreview, Select, StoryPreview, Switch, TextButton, Textarea, useToast, type Phase } from "@adsweet/ui";
import { Dropzone } from "@/components/ads/Dropzone";
import { nameFromFile, upload, type Uploaded } from "@/components/ads/upload";
import type { MakerContext } from "@/lib/server/campaigns";
import { launchAdAction } from "../../campagnes/actions";
import { rewriteAction } from "../actions";

const PHASES: Phase[] = ["top", "middle", "bottom"];
const EXTRAS = ["muziek", "tekst_op_beeld", "beelduitbreiding", "varianten"] as const;
type Extra = (typeof EXTRAS)[number];
const MIN_WIDTH = 1080;
const MAX_VIDEO_S = 60;

export interface MakerProps {
  m: MakerContext;
  campaignId: string;
  adSet: { id: string; name: string } | null;
  confirmed: boolean;
  initialFile: Uploaded | null;
  library: Uploaded[];
  demo: boolean;
}

/** Een advertentie maken (App.dc.html#advertentie-maken): acht stappen, het voorstel is meteen goed om live te zetten. */
export function AdMaker({ m, campaignId, adSet, confirmed, initialFile, library, demo }: MakerProps) {
  const t = useTranslations("adMaker");
  const router = useRouter();
  const toast = useToast();
  const campaign = m.campaigns.find((c) => c.id === campaignId) ?? m.campaigns[0];
  const funnel = campaign?.funnel ?? { top: 0, middle: 0, bottom: 0 };
  const suggested: Phase = (["bottom", "middle", "top"] as Phase[]).reduce((best, p) => (funnel[p] < funnel[best] ? p : best), "bottom" as Phase);

  const [file, setFile] = useState<Uploaded | null>(initialFile);
  const [badDemo, setBadDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [phase, setPhase] = useState<Phase>(suggested);
  const [texts, setTexts] = useState<string[]>(m.texts);
  const [v, setV] = useState(0);
  const [round, setRound] = useState(0);
  const [manual, setManual] = useState("");
  const [headline, setHeadline] = useState(m.headline);
  const [description, setDescription] = useState(m.description);
  const leads = m.goalType === "aanvragen";
  const ctas = t.raw("ctas") as string[];
  const [cta, setCta] = useState(phase === "bottom" ? (leads ? ctas[2] : ctas[0]) : ctas[1]);
  const [exOpen, setExOpen] = useState(false);
  const [extras, setExtras] = useState<Record<Extra, boolean>>({ muziek: false, tekst_op_beeld: false, beelduitbreiding: false, varianten: false });
  const [writing, startWriting] = useTransition();
  const [pending, start] = useTransition();

  const w = badDemo ? 600 : (file?.width ?? null);
  const h = badDemo ? 600 : (file?.height ?? null);
  const tooSmall = w !== null && w < MIN_WIDTH;
  const tooLong = file?.kind === "video" && (file.duration ?? 0) > MAX_VIDEO_S;
  const primary = m.hasAI ? (texts[v] ?? "") : manual;

  const onFiles = async (list: File[]) => {
    setBusy(true);
    try {
      setFile(await upload(list[0]));
      setBadDemo(false);
    } catch {
      toast.show({ message: t("uploadError") });
    } finally {
      setBusy(false);
    }
  };

  const rewrite = () =>
    startWriting(async () => {
      const res = await rewriteAction(round + 1);
      if (!res.ok) return;
      setRound((r) => r + 1);
      if (res.texts.length) setTexts(res.texts);
      setV(0);
    });

  const save = (draft: boolean) =>
    start(async () => {
      if (!file) return toast.show({ message: t("needFile") });
      const res = await launchAdAction({
        campaignId: campaign.id,
        adSetId: adSet?.id ?? null,
        confirmed,
        draft,
        ad: {
          name: nameFromFile(file.name),
          kind: file.kind,
          phase,
          primaryText: primary,
          variants: m.hasAI ? texts : [manual],
          headline,
          description,
          cta,
          extras,
          mediaId: file.id,
        },
      });
      if (!res.ok) return toast.show({ message: t("error") });
      toast.show({ message: draft ? t("draftToast") : t("liveToast") });
      if (!draft) router.push(`/campagnes/${res.campaignId}`);
    });

  const content = {
    page: m.biz.name,
    pageInitial: m.biz.initial,
    pageColor: m.biz.color,
    text: primary,
    headline,
    cta,
  };
  const media = (ratio: string) => ({
    src: file?.url ?? undefined,
    kind: file?.kind,
    placeholder: `${file?.kind === "video" ? t("video") : t("photo")} ${ratio}`,
  });

  return (
    <div className="am">
      <section className="am-section">
        <h2 className="am-h2">{t("s1")}</h2>
        {!file ? (
          <>
            <Dropzone title={t("drop")} sub={t("dropSub")} onFiles={onFiles} disabled={busy} />
            {busy ? <Loading>{t("uploading")}</Loading> : null}
            <div className="up-sources">
              {(t.raw("sources") as string[]).slice(0, 4).map((src) => (
                <TextButton key={src} icon="link" onClick={() => toast.show({ message: t("sourceLater", { source: src }) })}>
                  {src}
                </TextButton>
              ))}
              {library.length ? (
                <TextButton icon="image" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
                  {(t.raw("sources") as string[])[4]}
                </TextButton>
              ) : null}
              {m.hasAI ? (
                <TextButton icon="wand" onClick={() => router.push("/studio")}>
                  {t("ai")}
                </TextButton>
              ) : null}
            </div>
            {picking ? (
              <div className="lib-imgs">
                {library.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="lib-img as-card"
                    style={{ padding: 8, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", textAlign: "left" }}
                    onClick={() => {
                      setFile(f);
                      setPicking(false);
                    }}
                  >
                    <span className="as-hatch">{f.url ? <img src={f.url} alt="" /> : <Icon name={f.kind === "video" ? "video" : "image"} size={16} />}</span>
                    <span className="as-small">{f.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {demo ? (
              <button
                type="button"
                className="cp-demo"
                onClick={() => setFile({ id: null, name: t("sampleName"), kind: "video", url: null, width: 1080, height: 1920, duration: 14 })}
              >
                {t("sample")}
              </button>
            ) : null}
          </>
        ) : (
          <div className="up-file">
            <span>
              <Icon name={file.kind === "video" ? "video" : "image"} size={16} />
              {file.name}
            </span>
            <TextButton onClick={() => setFile(null)}>{t("replace")}</TextButton>
          </div>
        )}
      </section>

      {file ? (
        <>
          <section className="am-section">
            <h2 className="am-h2">{t("s2")}</h2>
            <ul className="am-checks">
              <li>
                <span>{t("checks.format")}</span>
                <span className={tooSmall ? "am-act" : "am-ok"}>
                  <Icon name={tooSmall ? "act" : "ok"} size={14} />
                  {w && h ? `${w} × ${h}` : "–"}
                </span>
              </li>
              <li>
                <span>{t("checks.length")}</span>
                <span className={tooLong ? "am-act" : "am-ok"}>
                  <Icon name={tooLong ? "act" : "ok"} size={14} />
                  {file.kind === "video" ? t("checks.seconds", { n: file.duration ?? 0 }) : t("checks.photo")}
                </span>
              </li>
              <li>
                <span>{t("checks.quality")}</span>
                <span className={tooSmall ? "am-act" : "am-ok"}>
                  <Icon name={tooSmall ? "act" : "ok"} size={14} />
                  {tooSmall ? t("checks.small") : t("checks.good")}
                </span>
              </li>
            </ul>
            {demo ? (
              <button type="button" className="cp-demo" onClick={() => setBadDemo((b) => !b)}>
                {badDemo ? t("demoGood") : t("demoBad")}
              </button>
            ) : null}
            {tooSmall ? (
              <p role="alert" className="am-alert">
                {t("tooSmall", { w: w ?? 0, h: h ?? 0 })}
              </p>
            ) : null}
            {tooLong ? (
              <p role="alert" className="am-alert">
                {t("tooLong", { n: file.duration ?? 0 })}
              </p>
            ) : null}
            <div className="am-crops">
              {(
                [
                  ["4:5", "4 / 5", 96, t("crops.feed")],
                  ["1:1", "1 / 1", 110, t("crops.feed")],
                  ["9:16", "9 / 16", 70, t("crops.story")],
                ] as const
              ).map(([ar, ratio, width, cap]) => (
                <figure key={ar} style={{ width }}>
                  <span className="as-hatch" style={{ aspectRatio: ratio }}>
                    {file.url && file.kind === "foto" ? <img src={file.url} alt="" /> : ar}
                  </span>
                  <figcaption>{cap}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="am-section">
            <h2 className="am-h2">{t("s3")}</h2>
            <p className="as-muted" style={{ margin: 0 }}>
              {t("phaseSuggest", { phase: t(`phaseOf.${suggested}`), why: t(`phaseWhy.${suggested}`) })}
            </p>
            <div role="radiogroup" aria-label={t("s3")} className="am-phases">
              {PHASES.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={phase === p} className={`am-phase as-phase--${p}`} onClick={() => setPhase(p)}>
                  {p[0].toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <span className="as-small as-muted">
              {campaign && funnel.top + funnel.middle + funnel.bottom > 0
                ? t("funnelNote", { top: funnel.top, middle: funnel.middle, bottom: funnel.bottom, advice: t(`funnelAdvice.${suggested}`) })
                : t("funnelGeneric")}
            </span>
          </section>

          <section className="am-section">
            <div className="am-row">
              <h2 className="am-h2">{t("s4")}</h2>
              {m.hasAI ? (
                <TextButton onClick={rewrite} disabled={writing}>
                  {t("rewrite")}
                </TextButton>
              ) : null}
            </div>
            {writing ? <Loading>{t("writing")}</Loading> : null}
            {m.hasAI && texts.length ? (
              <div role="radiogroup" aria-label={t("primary")} className="am-variants">
                {texts.map((x, i) => (
                  <button key={i} type="button" role="radio" aria-checked={v === i} className="am-variant" onClick={() => setV(i)}>
                    <span>{t("variant", { n: i + 1 })}</span>
                    {x}
                  </button>
                ))}
              </div>
            ) : (
              <Textarea
                label={t("primary")}
                rows={3}
                placeholder={t("primaryPh")}
                help={t("manualTip")}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
            )}
            <div className="am-fields">
              <Input label={t("headline")} value={headline} onChange={(e) => setHeadline(e.target.value)} />
              <Input label={t("description")} value={description} onChange={(e) => setDescription(e.target.value)} />
              <Select label={t("cta")} value={cta} options={ctas.map((c) => ({ value: c, label: c }))} onChange={(e) => setCta(e.target.value)} />
            </div>
          </section>

          <section className="am-section">
            <button type="button" className="am-extras-toggle" aria-expanded={exOpen} onClick={() => setExOpen((o) => !o)}>
              <span>{t("s6")}</span>
              <Icon name="plus" size={16} />
            </button>
            {exOpen ? (
              <>
                {EXTRAS.map((x, i) => (
                  <div key={x} className="am-extra">
                    <div className="am-extra__row">
                      <span>{(t.raw("extras") as string[])[i]}</span>
                      <Switch
                        label={(t.raw("extras") as string[])[i]}
                        checked={extras[x]}
                        deviates={extras[x]}
                        onChange={(on) => setExtras((e) => ({ ...e, [x]: on }))}
                      />
                    </div>
                    {extras[x] ? (
                      <p>
                        <b>{t("warnTitle")}</b> {t("extraWarn")}
                      </p>
                    ) : null}
                  </div>
                ))}
                <span className="as-small as-muted">{t("extrasBulk")}</span>
              </>
            ) : null}
          </section>

          <section className="am-section">
            <h2 className="am-h2">{t("s7")}</h2>
            <div className="as-previews">
              <FeedPreview c={{ ...content, media: media("4:5") }} caption={t("places.feed")} />
              <StoryPreview c={{ ...content, media: media("9:16") }} caption={t("places.stories")} />
              <ReelPreview c={{ ...content, media: media("9:16") }} caption={t("places.reels")} />
            </div>
          </section>

          <section className="am-done">
            <span>
              <b>{t("s8")}</b>
              <span className="as-muted">{t("s8Text")}</span>
            </span>
            <div className="cp-actions">
              <Button arrow onClick={() => save(false)} disabled={pending}>
                {adSet ? t("liveExisting", { adset: adSet.name.split(" · ")[0] }) : t("live")}
              </Button>
              <Button variant="secondary" onClick={() => save(true)} disabled={pending}>
                {t("draft")}
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
