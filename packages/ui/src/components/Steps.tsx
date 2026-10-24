"use client";

import { Icon } from "./Icon";

export interface StepsProps {
  label: string;
  steps: string[];
  /** 1-gebaseerd */
  current: number;
  /** Alleen stappen tot en met `reached` zijn klikbaar. */
  reached?: number;
  onPick?: (n: number) => void;
  /** Stapnummers zoals getoond (bv. als een stap wegvalt). */
  numbers?: number[];
}

/** Verticale stappenlijst: gedaan (vinkje), huidig (omrand), nog te doen. */
export function Steps({ label, steps, current, reached = current, onPick, numbers }: StepsProps) {
  return (
    <ol className="as-steps" aria-label={label}>
      {steps.map((t, i) => {
        const n = i + 1;
        const done = n < current;
        const cur = n === current;
        const locked = n > reached;
        return (
          <li key={t + n}>
            <button
              type="button"
              className={["as-step", done && "as-step--done"].filter(Boolean).join(" ")}
              aria-current={cur ? "step" : undefined}
              disabled={locked || !onPick}
              onClick={() => onPick?.(n)}
            >
              <span className="as-step__mark">{done ? <Icon name="check" size={12} strokeWidth={2} /> : (numbers?.[i] ?? n)}</span>
              <span>{t}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
