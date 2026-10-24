"use client";

import type { ReactNode } from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Rand in Actie nodig als de stand afwijkt van het playbook. */
  deviates?: boolean;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, deviates, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={["as-switch", deviates && "as-switch--warn"].filter(Boolean).join(" ")}
    >
      <span className="as-switch__knob" />
    </button>
  );
}

export interface SwitchRowProps extends SwitchProps {
  sub?: ReactNode;
  /** Bv. het waarschuwingsblok als de stand afwijkt. */
  children?: ReactNode;
}

export function SwitchRow({ sub, children, ...sw }: SwitchRowProps) {
  return (
    <div className="as-switchrow">
      <div className="as-switchrow__top">
        <div className="as-switchrow__text">
          <span className="as-switchrow__label">{sw.label}</span>
          {sub ? <span className="as-switchrow__sub">{sub}</span> : null}
        </div>
        <Switch {...sw} />
      </div>
      {children}
    </div>
  );
}
