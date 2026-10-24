"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** Als link: de tab navigeert naar deze href. */
  href?: string;
}

export interface TabsProps<T extends string> {
  label: string;
  value: T;
  items: TabItem<T>[];
  onChange?: (v: T) => void;
  /** id-voorvoegsel voor aria-controls van de panelen. */
  idPrefix?: string;
}

export function Tabs<T extends string>({ label, value, items, onChange, idPrefix }: TabsProps<T>) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + items.length) % items.length;
    refs.current[n]?.focus();
    if (!items[n].href) onChange?.(items[n].value);
  };
  return (
    <div role="tablist" aria-label={label} className="as-tabs">
      {items.map((it, i) => {
        const on = it.value === value;
        const common = {
          role: "tab" as const,
          "aria-selected": on,
          tabIndex: on ? 0 : -1,
          className: "as-tab",
          id: idPrefix ? `${idPrefix}-tab-${it.value}` : undefined,
          "aria-controls": idPrefix ? `${idPrefix}-panel-${it.value}` : undefined,
          onKeyDown: (e: KeyboardEvent) => onKey(e, i),
        };
        return it.href ? (
          <a
            key={it.value}
            href={it.href}
            ref={(el) => {
              refs.current[i] = el;
            }}
            {...common}
          >
            {it.label}
          </a>
        ) : (
          <button
            key={it.value}
            type="button"
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => onChange?.(it.value)}
            {...common}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
