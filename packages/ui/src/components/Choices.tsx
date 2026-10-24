"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface ChoiceOption<T extends string> {
  value: T;
  title: ReactNode;
  sub?: ReactNode;
  disabled?: boolean;
}

export interface ChoiceCardsProps<T extends string> {
  label: string;
  value: T | null;
  options: ChoiceOption<T>[];
  onChange: (v: T) => void;
  className?: string;
  columns?: string;
}

/** Keuzekaarten als radiogroep, met pijltjestoetsen. */
export function ChoiceCards<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  columns,
}: ChoiceCardsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + options.length) % options.length;
    refs.current[n]?.focus();
    if (!options[n].disabled) onChange(options[n].value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={["as-choices", className].filter(Boolean).join(" ")}
      style={columns ? { gridTemplateColumns: columns } : undefined}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={o.disabled || undefined}
            tabIndex={i === active ? 0 : -1}
            className="as-choice"
            onClick={() => !o.disabled && onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="as-choice__text">
              <span className="as-choice__title">{o.title}</span>
              {o.sub ? <span className="as-choice__sub">{o.sub}</span> : null}
            </span>
            <span className="as-choice__dot">
              {on ? <Icon name="check" size={12} strokeWidth={2} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface PillsProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  /** "pressed" voor filters, "radio" voor een keuze. */
  mode?: "pressed" | "radio";
}

export function Pills<T extends string>({
  label,
  value,
  options,
  onChange,
  mode = "pressed",
}: PillsProps<T>) {
  return (
    <div role={mode === "radio" ? "radiogroup" : "group"} aria-label={label} className="as-pills">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={mode === "radio" ? "radio" : undefined}
          aria-checked={mode === "radio" ? o.value === value : undefined}
          aria-pressed={mode === "pressed" ? o.value === value : undefined}
          className="as-pill"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: Omit<PillsProps<T>, "mode">) {
  return (
    <div role="group" aria-label={label} className="as-segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
