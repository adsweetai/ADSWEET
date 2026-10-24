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

/** Sweetmoment: het robijn punt pulseert één keer, met één zin. Verder niets. */
export function SweetMoment({ children, replayKey = 0 }: { children: ReactNode; replayKey?: number }) {
  return (
    <div role="status" className="as-sweet">
      <span key={replayKey} className="as-sweet__dot" aria-hidden="true" />
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
