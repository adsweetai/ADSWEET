"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Telt op in 600 ms (ease-out). Bij reduced motion meteen de eindwaarde. */
export function useCountUp(to: number, from = 0, ms = 600): number {
  const [v, setV] = useState(from);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced()) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * e));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [to, from, ms]);
  return v;
}

export function CountUp({ to, from = 0, format = String }: { to: number; from?: number; format?: (n: number) => string }) {
  const v = useCountUp(to, from);
  return <>{format(v)}</>;
}

// Snoeppartikels rond het punt: [kleur, dx, dy, draaiing] (App.dc.html).
const CONFETTI: [string, number, number, number][] = [
  ["roos", -26, -18, 120],
  ["citroen", 22, -22, -90],
  ["munt", 30, 10, 200],
  ["bes", -20, 18, -160],
  ["hemel", 6, -30, 80],
  ["perzik", -32, 4, 140],
  ["roos", 18, 24, -60],
];

/** Sweetmoment: het robijn punt pulseert één keer en een handvol snoep springt eruit, met één zin. Verder niets. */
export function SweetMoment({ children, replayKey = 0, box }: { children: ReactNode; replayKey?: number; box?: boolean }) {
  return (
    <div role="status" data-theme={box ? "light" : undefined} className={["as-sweet", box && "as-sweet--box"].filter(Boolean).join(" ")}>
      <span key={replayKey} className="as-sweet__mark" aria-hidden="true">
        <span className="as-sweet__dot" />
        {CONFETTI.map(([c, dx, dy, r], i) => (
          <span
            key={i}
            className={`as-sweet__bit as-bg-snoep--${c}`}
            style={{
              width: i % 2 ? 6 : 5,
              height: i % 2 ? 6 : 8,
              borderRadius: i % 3 ? "50%" : 2,
              ["--dx" as string]: `${dx}px`,
              ["--dy" as string]: `${dy}px`,
              ["--r" as string]: `${r}deg`,
              animationDelay: `${80 + i * 30}ms`,
            }}
          />
        ))}
      </span>
      <span className="as-sweet__text">{children}</span>
    </div>
  );
}

/** Binnenkomen: 12px omhoog, 600 ms, 60 ms na elkaar. */
export function Reveal({
  children,
  index = 0,
  as: Tag = "div",
  className,
}: {
  children: ReactNode;
  index?: number;
  as?: "div" | "section" | "li";
  className?: string;
}) {
  return (
    <Tag className={["as-reveal", className].filter(Boolean).join(" ")} style={{ animationDelay: `${index * 60}ms` }}>
      {children}
    </Tag>
  );
}
