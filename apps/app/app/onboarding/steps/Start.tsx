"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, IconButton, Input, Loader, TextButton, Textarea, useToast } from "@adsweet/ui";
import { upload } from "@/components/ads/upload";
import type { OnboardingVM } from "@/lib/server/onboarding";
import { manualAction, profileAction, readSiteAction, removeMediaAction, welcomeAction } from "../actions";
import { ObTip, StepFooter, useStepNav, useVM } from "../shared";

// ---------------------------------------------------------------------------
// Stap 1 · Welkom
// ---------------------------------------------------------------------------

export function StepWelcome() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const [name, setName] = useState(vm.firstName);
  const langs = t.raw("langs") as string[];
  return (
    <>
      <header className="ob-header">
        <h1 className="ob-h1">{t("welcome", { n: name || vm.firstName })}</h1>
        <p className="ob-lead">{t("welcomeLead")}</p>
      </header>
      <Input label={t("nameLabel")} help={t("nameHelp")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
      <div className="ob-group">
        <span className="ob-label">{t("langLabel")}</span>
        <div role="group" aria-label={t("langLabel")} className="as-pills">
          {langs.map((l, i) => (
            <button
              key={l}
              type="button"
              className="as-pill"
              aria-pressed={i === 0}
              aria-disabled={i > 0 || undefined}
              title={i > 0 ? t("langLater") : undefined}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <StepFooter prev={nav.prev} label={t("next")} pending={nav.pending} onNext={() => nav.next(() => welcomeAction(name))} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Stap 2 · Je website
// ---------------------------------------------------------------------------

type FoundVM = NonNullable<OnboardingVM["found"]>;

/** Wat AdSweet op je website vond, één voor één. */
export function FoundList({ found, shown }: { found: Omit<FoundVM, "imagesCount"> & { imagesCount?: number }; shown: number }) {
  const t = useTranslations("onboarding");
  const keys = t.raw("foundKeys") as string[];
  const count = found.imagesCount ?? found.imageCount;
  const rows = [
    <span key="n">{found.name}</span>,
    <span key="l" className="ob-logo" aria-hidden="true">
      {found.logo}
    </span>,
    found.colors.length ? (
      <span key="c" className="ob-swatches">
        {found.colors.map((c) => (
          <span key={c}>
            <span style={{ background: c }} aria-hidden="true" />
            {c}
          </span>
        ))}
      </span>
    ) : (
      <span key="c" className="as-muted">
        {t("noColors")}
      </span>
    ),
    <span key="s" className="ob-stack">
      <span>{found.sells || t("sellsUnknown")}</span>
      {found.sellsSub ? <span className="as-small as-muted">{found.sellsSub}</span> : null}
    </span>,
    <span key="t" className="ob-stack">
      <span>{found.tone.length ? found.tone.join(", ") : t("toneLater")}</span>
      {found.toneExample ? <span className="as-small as-muted">{t("example", { s: found.toneExample })}</span> : null}
    </span>,
    <span key="i" className="ob-imgs">
      {Array.from({ length: Math.min(9, count) }, (_, i) =>
        found.images[i] ? <img key={i} src={found.images[i]} alt="" /> : <span key={i} className="as-hatch" aria-hidden="true" />,
      )}
    </span>,
    <span key="r">{found.contact}</span>,
  ];
  return (
    <div className="ob-found">
      {rows.slice(0, shown).map((v, i) => (
        <div key={keys[i]} className="ob-found__row">
          <span className="ob-found__k">{keys[i]}</span>
          <div>{v}</div>
        </div>
      ))}
    </div>
  );
}

export function StepWebsite() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const toast = useToast();
  const [site, setSite] = useState(vm.site);
  const [manual, setManual] = useState(false);
  const [found, setFound] = useState<FoundVM | null>(vm.found);
  const [shown, setShown] = useState(vm.found ? 7 : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [fields, setFields] = useState({ name: "", sells: "", prices: "", audience: "", region: "", style: "" });
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);
  const manualKeys = ["name", "sells", "prices", "audience", "region", "style"] as const;
  const manualLabels = t.raw("manual") as string[];

  const read = () => {
    setBusy(true);
    setError(false);
    setShown(0);
    nav.start(async () => {
      const res = await readSiteAction(site);
      if (!res.ok) {
        setBusy(false);
        setError(true);
        return;
      }
      setFound({ ...res.found, imagesCount: res.found.imageCount });
      for (let i = 1; i <= 7; i++)
        timers.current.push(
          window.setTimeout(
            () => {
              setShown(i);
              if (i === 7) setBusy(false);
            },
            300 + i * 420,
          ),
        );
    });
  };
  const uploadMany = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      for (const f of [...files]) await upload(f);
      toast.show({ message: t("uploaded", { n: files.length }) });
    } catch {
      toast.show({ message: t("uploadError") });
    }
  };
  const done = !!found && shown >= 7;

  return (
    <>
      <h1 className="ob-h1">{t("siteTitle")}</h1>
      {!manual ? (
        <>
          <Input label={t("siteLabel")} value={site} placeholder="jouwzaak.be" inputMode="url" autoComplete="url" onChange={(e) => setSite(e.target.value)} />
          {!busy && !found ? (
            <div className="ob-row">
              <TextButton onClick={() => setManual(true)}>{t("noSite")}</TextButton>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="ob-alert">
              {t("readError")}
            </p>
          ) : null}
          {busy || found ? (
            <div className="ob-reading">
              <div role="status" aria-live="polite" className="ob-status">
                {done ? <Icon name="ok" size={18} className="ob-ok" /> : <Loader />}
                <span>{done ? t("found") : t("reading")}</span>
              </div>
              {found ? <FoundList found={found} shown={shown} /> : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="ob-grid">
            {manualKeys.map((k, i) => (
              <Input key={k} label={manualLabels[i]} value={fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} />
            ))}
          </div>
          <div className="ob-row">
            <label className="as-btn as-btn--secondary ob-file">
              {t("logo")}
              <input type="file" accept="image/*" onChange={(e) => uploadMany(e.target.files)} />
            </label>
            <label className="as-btn as-btn--secondary ob-file">
              {t("images")}
              <input type="file" accept="image/*,video/*" multiple onChange={(e) => uploadMany(e.target.files)} />
            </label>
          </div>
          <TextButton onClick={() => setManual(false)}>{t("backToSite")}</TextButton>
        </>
      )}
      <ObTip>{t("siteTip")}</ObTip>
      <StepFooter
        prev={nav.prev}
        pending={nav.pending || busy}
        disabled={!manual && !done && !site.trim()}
        label={!manual && !done ? t("read") : t("next")}
        onNext={() => (!manual && !done ? read() : nav.next(manual ? () => manualAction(fields) : undefined))}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Stap 3 · Je bedrijfsprofiel
// ---------------------------------------------------------------------------

export function StepProfile() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState(vm.profile);
  const [ok, setOk] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<Record<string, boolean>>({});
  const cards = [
    ["name", t("profileKeys.name")],
    ["sells", t("profileKeys.sells")],
    ["tone", t("profileKeys.tone")],
    ["contact", t("profileKeys.contact")],
  ] as const;
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      for (const f of [...files]) await upload(f);
      router.refresh();
    } catch {
      toast.show({ message: t("uploadError") });
    }
  };
  return (
    <>
      <header className="ob-header">
        <h1 className="ob-h1">{t("profileTitle")}</h1>
        <p className="ob-lead">{t("profileLead")}</p>
      </header>
      <div className="ob-cards">
        {cards.map(([k, label]) => (
          <div key={k} className={["ob-card", ok[k] && "ob-card--ok"].filter(Boolean).join(" ")}>
            <span className="ob-found__k">{label}</span>
            {edit[k] ? (
              <Textarea label={label} rows={2} value={p[k]} onChange={(e) => setP((x) => ({ ...x, [k]: e.target.value }))} />
            ) : (
              <span>{p[k] || "–"}</span>
            )}
            <div className="ob-row">
              <button
                type="button"
                className="as-pill"
                aria-pressed={!!ok[k]}
                onClick={() => {
                  setOk((o) => ({ ...o, [k]: !o[k] }));
                  setEdit((e) => ({ ...e, [k]: false }));
                }}
              >
                {t("ok")}
              </button>
              <TextButton onClick={() => setEdit((e) => ({ ...e, [k]: !e[k] }))}>{t("edit")}</TextButton>
            </div>
          </div>
        ))}
      </div>
      <div className="ob-group">
        <span className="ob-label">{t("imageCount", { n: vm.images.length })}</span>
        <div className="ob-imggrid">
          {vm.images.map((im) => (
            <div key={im.id} className="ob-imgtile">
              {im.url ? <img src={im.url} alt={im.name} /> : <span className="as-hatch" aria-hidden="true" />}
              <IconButton icon="x" size={12} label={t("remove")} onClick={() => nav.start(() => removeMediaAction(im.id))} />
            </div>
          ))}
          <label className="ob-imgadd">
            {t("add")}
            <input type="file" accept="image/*,video/*" multiple onChange={(e) => add(e.target.files)} />
          </label>
        </div>
      </div>
      <div className="ob-grid ob-grid--1">
        <Textarea label={t("q1")} rows={2} value={p.differentiator} onChange={(e) => setP((x) => ({ ...x, differentiator: e.target.value }))} />
        <Textarea label={t("q2")} rows={2} value={p.bestCustomers} onChange={(e) => setP((x) => ({ ...x, bestCustomers: e.target.value }))} />
        <Textarea label={t("q3")} help={t("q3help")} rows={2} value={p.competitors} onChange={(e) => setP((x) => ({ ...x, competitors: e.target.value }))} />
      </div>
      <StepFooter prev={nav.prev} label={t("next")} pending={nav.pending} onNext={() => nav.next(() => profileAction(p))} />
    </>
  );
}
