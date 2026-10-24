"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Goal } from "@adsweet/db";
import { breakEvenRoas, maxCostPerSale } from "@adsweet/playbook";
import { Button, ChoiceCards, DotCharacter, Icon, Input, Loader, Logo, Meter, Textarea, TextButton, formatEuro, formatRoas, useToast } from "@adsweet/ui";
import { Dropzone } from "@/components/ads/Dropzone";
import { upload } from "@/components/ads/upload";
import type { TuningVM } from "@/lib/server/tuning";
import { brandAction, offerAction, removeDocAction, sampleDocsAction, stepDoneAction, toneAction, tuningGoalAction, tuningSiteAction } from "./actions";

const COLORS = ["roos", "citroen", "munt", "hemel", "bes", "perzik", "roos", "citroen"];
const OPTIONAL = [2, 3];
const TONES = ["warm", "ambachtelijk", "rustig", "speels", "direct", "luxueus", "grappig", "eerlijk", "deskundig", "persoonlijk"];
const MOMENTS = ["feest", "solden", "bf", "val", "moeder", "zomer"] as const;
const DOC_CATS = ["prijs", "reviews", "resultaten", "anders"] as const;

async function sendDoc(file: File, category: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("category", category);
  const res = await fetch("/api/documents", { method: "POST", body: form });
  if (!res.ok) throw new Error(String(res.status));
}

/** Stem AdSweet af op je zaak: links de stappen met voortgang, rechts Dot en één stap per scherm. */
export function Tuning({ vm }: { vm: TuningVM }) {
  const t = useTranslations("tuning");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const steps = t.raw("steps") as [string, string, string][];
  const say = t.raw("say") as string[];
  const i = vm.step;
  const doneN = vm.done.length;
  const optional = OPTIONAL.includes(i);

  // Gedeelde staat per stap
  const [site, setSite] = useState(vm.site);
  const [read, setRead] = useState<"idle" | "busy" | "done" | "error">(vm.found ? "done" : "idle");
  const [found, setFound] = useState(vm.found);
  const [shown, setShown] = useState(vm.found ? 6 : 0);
  const [colors, setColors] = useState(vm.brand.colors);
  const [font, setFont] = useState(vm.brand.font);
  const [neverSay, setNeverSay] = useState(vm.brand.neverSay);
  const [offer, setOffer] = useState(vm.offer);
  const [tones, setTones] = useState(vm.tone.tones);
  const [sayYes, setSayYes] = useState(vm.tone.sayYes);
  const [sayNo, setSayNo] = useState(vm.tone.sayNo);
  const [goal, setGoal] = useState<Goal["type"] | null>(vm.goal.type);
  const [aov, setAov] = useState(vm.goal.aov);
  const [margin, setMargin] = useState(vm.goal.margin);
  const [cpl, setCpl] = useState(vm.goal.cpl);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);

  const go = (n: number) => router.push(`/afstemmen/${n}`);
  const finish = (skip: boolean, save?: () => Promise<void>) =>
    start(async () => {
      if (save) await save();
      await stepDoneAction(i, skip);
      if (i < 8) go(i + 1);
      else router.push("/vandaag");
    });

  const readSite = () => {
    setRead("busy");
    setShown(0);
    start(async () => {
      const res = await tuningSiteAction(site);
      if (!res.ok) return setRead("error");
      const f = res.found;
      setFound([
        { k: "name", v: f.name },
        { k: "sells", v: f.sells },
        { k: "prices", v: f.sellsSub ?? f.offers.map((o) => `${o.name} ${o.price}`).join(" · ") },
        { k: "colors", v: String(f.colors.length) },
        { k: "images", v: String(f.imageCount) },
        { k: "contact", v: f.contact },
      ]);
      for (let k = 1; k <= 6; k++)
        timers.current.push(
          window.setTimeout(
            () => {
              setShown(k);
              if (k === 6) setRead("done");
            },
            300 + k * 420,
          ),
        );
    });
  };

  const uploadDocs = (files: File[], category: string) =>
    start(async () => {
      try {
        for (const f of files) await sendDoc(f, category);
        router.refresh();
      } catch {
        toast.show({ message: t("uploadError") });
      }
    });
  const uploadImages = (files: File[]) =>
    start(async () => {
      try {
        for (const f of files) await upload(f);
        router.refresh();
      } catch {
        toast.show({ message: t("uploadError") });
      }
    });

  const m = (Number(margin.replace(",", ".")) || 0) / 100;
  const aovN = Number(aov.replace(",", ".")) || 0;
  const be = m > 0 ? breakEvenRoas(m) : 0;
  const foundLabel = (k: string, v: string) =>
    k === "colors" ? t("foundColors", { n: Number(v) }) : k === "images" ? t("foundImages", { n: Number(v) }) : v || "–";
  const sample = vm.tone.samples[["grappig", "speels", "luxueus", "direct"].find((x) => tones.includes(x)) ?? "warm"] ?? t("sampleLater");
  const goals = t.raw("goals") as [string, string][];

  const nextLabel = i === 1 && read !== "done" ? t("read") : i === 8 ? t("toToday") : t("next");
  const onNext = () => {
    if (i === 1 && read !== "done") return readSite();
    if (i === 2) return finish(false, () => brandAction({ colors, font, neverSay }));
    if (i === 5) return finish(false, () => offerAction(offer));
    if (i === 6) return finish(false, () => toneAction({ tones, sayYes, sayNo }));
    if (i === 7 && goal) return finish(false, () => tuningGoalAction({ type: goal, aov, margin, cpl }));
    finish(false);
  };

  return (
    <div className="tn">
      <aside className="tn-side" aria-label={t("stepsLabel")}>
        <Link href="/vandaag" aria-label="AdSweet" className="tn-logo">
          <Logo height={18} />
        </Link>
        <div className="tn-card" data-theme="light">
          <span className="tn-dots" aria-hidden="true">
            <span className="as-dotfill--roos" />
            <span className="as-dotfill--citroen" />
            <span className="as-dotfill--munt" />
          </span>
          <b>{t("cardTitle", { name: vm.orgName })}</b>
          <span className="as-small">{t("doneText", { n: doneN })}</span>
          <Meter value={doneN} max={8} label={t("progress")} thin role="progressbar" />
          <span className="as-small">{doneN >= 8 ? t("allDone") : t("timeLeft", { n: Math.max(1, Math.round((8 - doneN) * 1.2)) })}</span>
        </div>
        <ol className="tn-steps">
          {steps.map(([title, sub], j) => {
            const n = j + 1;
            const done = vm.done.includes(n);
            const skipped = vm.skipped.includes(n);
            return (
              <li key={title}>
                <button type="button" className="tn-step" aria-current={n === i ? "step" : undefined} onClick={() => go(n)}>
                  <span className={["tn-mark", done && `tn-mark--done as-dotfill--${COLORS[j]}`].filter(Boolean).join(" ")}>
                    {done ? <Icon name="check" size={13} strokeWidth={2} /> : n}
                  </span>
                  <span className="tn-step__text">
                    <span>{title}</span>
                    <span className="as-small as-muted">{skipped ? t("skipped") : OPTIONAL.includes(n) ? t("optionalSub", { sub }) : sub}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <span className="as-small as-muted">{t("saved")}</span>
      </aside>

      <main className="tn-main">
        <div className="tn-inner" aria-busy={pending}>
          {vm.hasAI ? (
            <div className="tn-dot">
              <DotCharacter size={76} mood={i === 8 ? "viert" : read === "busy" ? "denkt" : i === 1 && read === "done" ? "blij" : "praat"} label="Dot" />
              <span role="status" aria-live="polite" className="tn-say">
                {say[i - 1]}
              </span>
            </div>
          ) : null}
          <header className="tn-head">
            <span className="as-small as-muted">
              {t("stepOf", { n: i })}
              {optional ? ` · ${t("optional")}` : ""}
            </span>
            <h1 className="tn-title">{i === 8 ? t("doneTitle") : steps[i - 1][0]}</h1>
            <p className="tn-lead">{i === 8 ? t("doneLead", { name: vm.orgName }) : steps[i - 1][2]}</p>
          </header>

          {i === 1 ? (
            <>
              <Input label={t("siteLabel")} value={site} placeholder="jouwzaak.be" onChange={(e) => setSite(e.target.value)} />
              {read === "error" ? (
                <p role="alert" className="ob-alert">
                  {t("readError")}
                </p>
              ) : null}
              {read === "busy" || read === "done" ? (
                <div className="tn-found">
                  <div role="status" aria-live="polite" className="ob-status">
                    {read === "done" ? <Icon name="ok" size={18} className="ob-ok" /> : <Loader />}
                    <span>{read === "done" ? t("found") : t("reading")}</span>
                  </div>
                  {(found ?? []).slice(0, shown).map((f, j) => (
                    <div key={f.k} className="tn-found__row">
                      <span>
                        <span className={`tn-chip as-dotfill--${COLORS[j]}`} aria-hidden="true" />
                        {t(`foundKeys.${f.k}`)}
                      </span>
                      <b>{foundLabel(f.k, f.v)}</b>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {i === 2 ? (
            <>
              <Dropzone title={t("brandDrop")} sub={t("brandDropSub")} onFiles={(f) => uploadDocs(f, "brandguide")} disabled={pending} />
              {vm.brand.file ? (
                <div className="up-file">
                  <span>
                    <Icon name="file" size={18} />
                    {vm.brand.file}
                  </span>
                  <span className="as-small as-muted">{t("uploadedStatus")}</span>
                </div>
              ) : null}
              <div className="tn-box">
                <span className="ob-label">{vm.brand.file ? t("brandFrom") : t("brandSelf")}</span>
                <div className="tn-colors">
                  {colors.map((c, j) => (
                    <label key={j} className="tn-color">
                      <span style={{ background: /^#[0-9a-f]{3,8}$/i.test(c) ? c : undefined }} aria-hidden="true" />
                      <input
                        value={c}
                        placeholder="#"
                        aria-label={t("brandColor", { n: j + 1 })}
                        onChange={(e) => setColors((x) => x.map((y, k) => (k === j ? e.target.value : y)))}
                      />
                    </label>
                  ))}
                </div>
                <div className="ob-grid">
                  <Input
                    label={t("font")}
                    value={font}
                    placeholder={vm.brand.file ? "[letter uit je brandguide]" : ""}
                    onChange={(e) => setFont(e.target.value)}
                  />
                  <label className="as-btn as-btn--secondary ob-file tn-logo-btn">
                    {vm.brand.logo ? t("logoDone") : t("logo")}
                    <input type="file" accept="image/*,.svg" onChange={(e) => e.target.files?.[0] && uploadDocs([e.target.files[0]], "logo")} />
                  </label>
                </div>
                <Textarea label={t("neverSay")} rows={2} placeholder={t("neverSayPh")} value={neverSay} onChange={(e) => setNeverSay(e.target.value)} />
              </div>
            </>
          ) : null}

          {i === 3 ? (
            <>
              <div className="tn-docs">
                {DOC_CATS.map((cat) => {
                  const n = vm.docs.filter((d) => d.category === cat).length;
                  const [title, text] = t.raw(`docs.${cat}`) as [string, string];
                  return (
                    <label key={cat} className={["tn-doc", n && "tn-doc--has", `tn-doc--${cat}`].filter(Boolean).join(" ")} data-theme="light">
                      <span className="ob-row">
                        <b>{title}</b>
                        {n ? <span className="as-small">{t("files", { n })}</span> : null}
                      </span>
                      <span className="as-small">{text}</span>
                      <span className="tn-doc__btn">{n ? t("addMore") : t("uploadBtn")}</span>
                      <input type="file" multiple onChange={(e) => e.target.files?.length && uploadDocs([...e.target.files], cat)} />
                    </label>
                  );
                })}
              </div>
              {vm.docs.length ? (
                <ul className="tn-files">
                  {vm.docs.map((d) => (
                    <li key={d.id}>
                      <span>
                        <Icon name="file" size={18} />
                        <span className="ob-stack">
                          <b>{d.name}</b>
                          <span className="as-small as-muted">
                            {(t.raw(`docs.${d.category}`) as [string, string])[0]} · {t("docPending")}
                          </span>
                        </span>
                      </span>
                      <span className="ob-row">
                        <span className="as-small as-muted">{t("uploadedStatus")}</span>
                        <TextButton onClick={() => start(() => removeDocAction(d.id))}>{t("remove")}</TextButton>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {vm.demo ? (
                <button type="button" className="cp-demo" onClick={() => start(() => sampleDocsAction())}>
                  {t("sampleDocs")}
                </button>
              ) : null}
              <p className="as-small as-muted">{t("docsNote")}</p>
            </>
          ) : null}

          {i === 4 ? (
            <>
              <Dropzone title={t("imagesDrop")} sub={t("imagesDropSub")} multiple big onFiles={uploadImages} disabled={pending} />
              <div className="up-sources">
                {["Google Drive", "Dropbox", "Canva", "Figma"].map((src) => (
                  <TextButton key={src} icon="link" onClick={() => toast.show({ message: t("sourceLater", { source: src }) })}>
                    {t("from", { source: src })}
                  </TextButton>
                ))}
              </div>
              <div className="lib-imgs">
                {vm.images.map((im) => (
                  <figure key={im.id} className="lib-img">
                    <span className={im.url ? undefined : "as-hatch"}>
                      {im.url ? <img src={im.url} alt={im.name} /> : <Icon name={im.kind === "video" ? "video" : "image"} size={18} />}
                    </span>
                    <figcaption>
                      <span>{im.source === "website" ? t("fromSite", { name: im.name }) : im.name}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <span className="as-small as-muted">
                {vm.images.some((x) => x.source !== "website")
                  ? t("imgNoteAdded", { n: vm.images.filter((x) => x.source !== "website").length })
                  : t("imgNoteSite")}
              </span>
            </>
          ) : null}

          {i === 5 ? (
            <>
              <div className="ob-grid">
                <Textarea label={t("offer.sells")} rows={2} value={offer.sells} onChange={(e) => setOffer((o) => ({ ...o, sells: e.target.value }))} />
                <Textarea
                  label={t("offer.audience")}
                  rows={2}
                  placeholder={t("offer.audiencePh")}
                  value={offer.audience}
                  onChange={(e) => setOffer((o) => ({ ...o, audience: e.target.value }))}
                />
              </div>
              <Textarea
                label={t("offer.diff")}
                rows={2}
                placeholder={t("offer.diffPh")}
                value={offer.differentiator}
                onChange={(e) => setOffer((o) => ({ ...o, differentiator: e.target.value }))}
              />
              <Textarea
                label={t("offer.best")}
                rows={2}
                placeholder={t("offer.bestPh")}
                value={offer.bestsellers}
                onChange={(e) => setOffer((o) => ({ ...o, bestsellers: e.target.value }))}
              />
              <div className="ob-group">
                <span className="ob-label">{t("moments")}</span>
                <div className="as-pills" role="group" aria-label={t("moments")}>
                  {MOMENTS.map((mo) => (
                    <button
                      key={mo}
                      type="button"
                      className="as-pill"
                      aria-pressed={offer.moments.includes(mo)}
                      onClick={() => setOffer((o) => ({ ...o, moments: o.moments.includes(mo) ? o.moments.filter((x) => x !== mo) : [...o.moments, mo] }))}
                    >
                      {t(`momentNames.${mo}`)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {i === 6 ? (
            <>
              <div className="ob-group">
                <span className="ob-label">{t("toneQ")}</span>
                <div className="as-pills" role="group" aria-label={t("toneQ")}>
                  {TONES.map((tn) => (
                    <button
                      key={tn}
                      type="button"
                      className="as-pill"
                      aria-pressed={tones.includes(tn)}
                      onClick={() => setTones((x) => (x.includes(tn) ? x.filter((y) => y !== tn) : x.length < 3 ? [...x, tn] : x))}
                    >
                      {tn}
                    </button>
                  ))}
                </div>
                <span className="as-small as-muted">{t("toneCount", { n: tones.length, list: tones.join(", ") })}</span>
              </div>
              <div className="ob-grid">
                <Input label={t("sayYes")} value={sayYes} onChange={(e) => setSayYes(e.target.value)} />
                <Input label={t("sayNo")} value={sayNo} onChange={(e) => setSayNo(e.target.value)} />
              </div>
              <div className="tn-sample" data-theme="light">
                <span className="as-small">{t("sampleTitle")}</span>
                <span className="tn-sample__text">{sample}</span>
              </div>
            </>
          ) : null}

          {i === 7 ? (
            <>
              <ChoiceCards
                label={t("goalQ")}
                value={goal}
                options={(["verkopen", "aanvragen", "zaak", "anders"] as Goal["type"][]).map((id, j) => ({ value: id, title: goals[j][0], sub: goals[j][1] }))}
                onChange={setGoal}
              />
              {goal === "verkopen" ? (
                <div className="ob-grid">
                  <Input label={t("aov")} inputMode="decimal" value={aov} onChange={(e) => setAov(e.target.value)} />
                  <Input label={t("margin")} inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} />
                </div>
              ) : goal === "aanvragen" || goal === "zaak" ? (
                <div className="ob-grid">
                  <Input label={t("cpl")} prefix="€" inputMode="decimal" value={cpl} onChange={(e) => setCpl(e.target.value)} />
                </div>
              ) : null}
              {goal === "verkopen" ? (
                <div role="status" className="ob-calc">
                  <span>
                    {m > 0 && aovN > 0
                      ? t("calc", { m: `${Math.round(m * 100)}%`, be: formatRoas(be), max: formatEuro(maxCostPerSale(aovN, m), 2) })
                      : t("calcEmpty")}
                  </span>
                </div>
              ) : null}
            </>
          ) : null}

          {i === 8 ? (
            <>
              <div className="tn-summary">
                {(
                  [
                    [
                      "site",
                      vm.done.includes(1) || read === "done" ? t("sum.siteRead", { n: (found ?? []).length || 6 }) : t("sum.siteNot"),
                      vm.done.includes(1) || read === "done",
                    ],
                    ["brand", vm.brand.file ?? (vm.skipped.includes(2) ? t("sum.brandSkipped") : t("sum.colors", { n: colors.filter(Boolean).length })), true],
                    ["docs", vm.docs.length ? t("sum.docsN", { n: vm.docs.length }) : t("sum.noDocs"), vm.docs.length > 0],
                    ["images", t("sum.imagesN", { n: vm.images.length }), vm.images.length > 0],
                    ["tone", tones.join(", ") || t("sum.noTone"), tones.length > 0],
                    [
                      "goal",
                      goal
                        ? goals[["verkopen", "aanvragen", "zaak", "anders"].indexOf(goal)][0] +
                          (m > 0 && goal === "verkopen" ? ` · ${t("sum.be", { be: formatRoas(be) })}` : "")
                        : "–",
                      !!goal,
                    ],
                  ] as [string, string, boolean][]
                ).map(([k, v, ok], j) => (
                  <div key={k} className={`tn-sum tn-sum--${j}`} data-theme="light">
                    <span>
                      {t(`sum.${k}`)}
                      <Icon name={ok ? "ok" : "hourglass"} size={15} />
                    </span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              <p className="tn-lead">{t("doneText2")}</p>
            </>
          ) : null}

          <div className="tn-nav">
            <Button variant="secondary" className={i === 1 ? "wz-hidden" : undefined} onClick={() => go(Math.max(1, i - 1))}>
              {t("prev")}
            </Button>
            <div className="cp-actions">
              {optional ? (
                <Button variant="secondary" onClick={() => finish(true)} disabled={pending}>
                  {t("skip")}
                </Button>
              ) : null}
              <Button
                arrow
                onClick={onNext}
                disabled={pending || (i === 1 && read === "busy") || (i === 1 && read !== "done" && !site.trim()) || (i === 7 && !goal)}
              >
                {nextLabel}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
