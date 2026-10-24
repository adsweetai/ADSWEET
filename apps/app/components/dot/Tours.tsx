"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DotCharacter } from "@adsweet/ui";
import { tourSeenAction } from "@/app/(app)/dot-actions";
import "./dot.css";

type TourName = "app" | "campagne" | "wizard";
interface StepDef {
  sel?: string;
  t: string;
  d: string;
}
interface Active {
  name: TourName;
  steps: (StepDef & { el: Element | null })[];
  i: number;
}

const CANDY = ["roos", "citroen", "munt", "bes", "hemel", "perzik"];

function tourFor(pathname: string): TourName | null {
  if (pathname === "/vandaag") return "app";
  if (pathname === "/campagnes/nieuw") return "wizard";
  if (/^\/campagnes\/[0-9a-f-]{36}$/.test(pathname)) return "campagne";
  return null;
}

const visible = (el: Element | null) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

/**
 * Rondleidingen met een spotlight en uitleg per stap (rondleiding.js). De eerste keer start de rondleiding vanzelf;
 * opnieuw kan via Hulp (?rondleiding=app). Gezien wordt bewaard in user_tours.
 */
export function Tours({ seen, hasAI }: { seen: TourName[]; hasAI: boolean }) {
  const t = useTranslations("tours");
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const [active, setActive] = useState<Active | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const done = useRef(new Set<TourName>(seen));
  const card = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);

  const start = useCallback(
    (name: TourName) => {
      const defs = (t.raw(`${name}.steps`) as StepDef[]).map((s, i) =>
        // Starter heeft geen Dot: de eerste stap stelt dan de app voor, niet Dot.
        !hasAI && name === "app" && i === 0 ? { t: t("starterIntro.t"), d: t("starterIntro.d") } : s,
      );
      const steps = defs.map((s) => ({ ...s, el: s.sel ? ([...document.querySelectorAll(s.sel)].find(visible) ?? null) : null })).filter((s) => !s.sel || s.el);
      if (!steps.length) return;
      prevFocus.current = document.activeElement;
      setActive({ name, steps, i: 0 });
    },
    [t, hasAI],
  );

  const end = useCallback(() => {
    setActive((a) => {
      if (a) {
        done.current.add(a.name);
        tourSeenAction(a.name).catch(() => undefined);
      }
      return null;
    });
    (prevFocus.current as HTMLElement | null)?.focus?.({ preventScroll: true });
  }, []);

  // Vanzelf de eerste keer, of op vraag via ?rondleiding=…
  useEffect(() => {
    const forced = sp.get("rondleiding") as TourName | null;
    const name = forced && ["app", "campagne", "wizard"].includes(forced) ? forced : tourFor(pathname);
    if (!name || (!forced && done.current.has(name))) return;
    if (!forced && name === "app" && !document.querySelector('[data-tour="greet"]')) return;
    const timer = window.setTimeout(() => {
      start(name);
      if (forced) router.replace(pathname, { scroll: false });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [pathname, sp, start, router]);

  const step = active?.steps[active.i] ?? null;

  const place = useCallback(() => {
    if (!step?.el || !document.contains(step.el)) return setRect(null);
    setRect(step.el.getBoundingClientRect());
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    if (step.el) step.el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const timer = window.setTimeout(
      () => {
        place();
        card.current?.querySelector<HTMLButtonElement>("[data-next]")?.focus({ preventScroll: true });
      },
      step.el ? 350 : 0,
    );
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [step, place]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return end();
      if (e.key === "ArrowRight") setActive((a) => (a && a.i < a.steps.length - 1 ? { ...a, i: a.i + 1 } : a));
      if (e.key === "ArrowLeft") setActive((a) => (a && a.i > 0 ? { ...a, i: a.i - 1 } : a));
      if (e.key === "Tab" && card.current) {
        const f = [...card.current.querySelectorAll<HTMLElement>("button")];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, end]);

  if (!active || !step) return null;
  const n = active.steps.length;
  const last = active.i === n - 1;
  const pad = 8;
  const hole = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  // De kaart onder het doel, of erboven als er onder geen plaats is. Zonder doel in het midden.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const cw = Math.min(360, vw - 32);
  let pos: React.CSSProperties = { left: (vw - cw) / 2, top: Math.max(16, vh / 2 - 160) };
  if (hole) {
    const below = hole.top + hole.height + 12;
    const left = Math.min(Math.max(16, hole.left), vw - cw - 16);
    pos = below + 260 < vh ? { left, top: below } : { left, top: Math.max(16, hole.top - 12 - 260) };
  }
  return (
    <div className="tour" data-tour-overlay="">
      {hole ? <div className="tour-hole" style={hole} /> : <div className="tour-scrim" />}
      <div ref={card} role="dialog" aria-modal="true" aria-labelledby="tour-title" className="tour-card" style={{ ...pos, width: cw }}>
        <div className="tour-card__top">
          {hasAI ? <DotCharacter size={40} mood={last ? "blij" : "praat"} /> : <span />}
          <span className={`tour-chip as-dotfill--${CANDY[active.i % CANDY.length]}`}>{t("stepOf", { i: active.i + 1, n })}</span>
        </div>
        <h2 id="tour-title" aria-live="polite">
          {step.t}
        </h2>
        <p>{step.d.replace("{n}", String(n))}</p>
        <div className="tour-dots" aria-hidden="true">
          {active.steps.map((_, j) => (
            <span
              key={j}
              className={j <= active.i ? `tour-dot tour-dot--on as-dotfill--${CANDY[j % CANDY.length]}` : "tour-dot"}
              data-current={j === active.i || undefined}
            />
          ))}
        </div>
        <div className="tour-btns">
          <button type="button" className="as-textbtn" onClick={end}>
            {last ? t("close") : t("skip")}
          </button>
          <span className="tour-btns__right">
            {active.i > 0 ? (
              <button type="button" className="as-btn as-btn--secondary" onClick={() => setActive({ ...active, i: active.i - 1 })}>
                {t("prev")}
              </button>
            ) : null}
            <button type="button" data-next className="as-btn as-btn--primary" onClick={() => (last ? end() : setActive({ ...active, i: active.i + 1 }))}>
              {last ? t("done") : t("next")}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
