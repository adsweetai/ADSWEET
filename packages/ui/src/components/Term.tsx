"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface TermExplanation {
  title: ReactNode;
  text: ReactNode;
  /** "In jouw cijfers:" met een rekenvoorbeeld uit het eigen account. */
  example?: ReactNode;
  exampleLabel?: ReactNode;
  lesson?: { label: ReactNode; href: string };
}

/** Uitlegkaartje voor een vakwoord, los of zwevend. */
export function TermCard({ title, text, example, exampleLabel, lesson, floating, id }: TermExplanation & { floating?: boolean; id?: string }) {
  return (
    <span id={id} role={floating ? "tooltip" : undefined} className={["as-termcard", floating && "as-termcard--float"].filter(Boolean).join(" ")}>
      <b className="as-termcard__title">{title}</b>
      <span>{text}</span>
      {example ? (
        <span className="as-termcard__ex">
          {exampleLabel ? <b>{exampleLabel} </b> : null}
          {example}
        </span>
      ) : null}
      {lesson ? (
        <a className="as-link" href={lesson.href}>
          {lesson.label}
        </a>
      ) : null}
    </span>
  );
}

/** Vakwoord met een stippellijn. Hover, focus of tik toont het uitlegkaartje. Esc sluit. */
export function Term({ children, explanation }: { children: ReactNode; explanation: TermExplanation }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <span
      ref={ref}
      className="as-term"
      tabIndex={0}
      role="button"
      aria-describedby={open ? id : undefined}
      aria-expanded={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      onClick={() => setOpen(true)}
    >
      {children}
      {open ? <TermCard {...explanation} floating id={id} /> : null}
    </span>
  );
}
