"use client";

import { useState, type ReactNode } from "react";
import { ProposalLabel, StatusBadge, type StatusKind } from "./Badges";
import { Button } from "./Button";
import { TipLine } from "./Advice";

export interface ActionButton {
  label: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Slotje: functie buiten het plan. */
  locked?: boolean;
  disabled?: boolean;
}

export interface ActionCardProps {
  /** "Voorstel van AdSweet" */
  proposalLabel: ReactNode;
  /** Robijn punt alleen op de bovenste kaart (en niet als er een Sweetmoment staat). */
  robijn?: boolean;
  badge?: { kind: StatusKind; label: ReactNode };
  title: ReactNode;
  stats?: { label: ReactNode; value: ReactNode }[];
  text?: ReactNode;
  explain?: ReactNode;
  /** Inhoud achter "Waarom?" (de rekensom). Zonder `why.onClick` klapt hij open in de kaart. */
  why?: { label: ReactNode; content?: ReactNode; onClick?: () => void };
  /** Waarschuwingsblok in de kaart. */
  warning?: ReactNode;
  tip?: ReactNode;
  primary?: ActionButton;
  secondary?: ActionButton[];
  later?: ActionButton;
  className?: string;
  id?: string;
}

function Btn({ b, variant }: { b: ActionButton; variant: "primary" | "secondary" }) {
  if (b.href)
    return (
      <a className={`as-btn as-btn--${variant}${variant === "primary" ? " as-btn--arrow" : ""}`} href={b.href}>
        {b.label}
      </a>
    );
  return (
    <Button variant={variant} onClick={b.onClick} locked={b.locked} disabled={b.disabled}>
      {b.label}
    </Button>
  );
}

/** Actiekaart, de kern van Vandaag: label, titel, cijfers, uitleg, tip en de knoppen. */
export function ActionCard(p: ActionCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const inlineWhy = p.why && !p.why.onClick && p.why.content;
  return (
    <article className={["as-action", p.className].filter(Boolean).join(" ")} id={p.id}>
      <div className="as-action__head">
        <ProposalLabel robijn={p.robijn}>{p.proposalLabel}</ProposalLabel>
        {p.badge ? <StatusBadge kind={p.badge.kind}>{p.badge.label}</StatusBadge> : null}
      </div>
      <h3 className="as-action__title">{p.title}</h3>
      {p.stats?.length ? (
        <div className="as-action__stats" style={{ ["--cols" as string]: p.stats.length }}>
          {p.stats.map((s, i) => (
            <div className="as-action__stat" key={i}>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
      ) : null}
      {p.text ? <p className="as-action__text">{p.text}</p> : null}
      {p.explain ? <p className="as-action__explain">{p.explain}</p> : null}
      {inlineWhy && whyOpen ? <div className="as-action__why">{p.why!.content}</div> : null}
      {p.warning}
      {p.tip ? <TipLine>{p.tip}</TipLine> : null}
      <div className="as-action__buttons">
        {p.primary ? <Btn b={p.primary} variant="primary" /> : null}
        {p.why ? (
          <button
            type="button"
            className="as-btn as-btn--secondary"
            aria-expanded={inlineWhy ? whyOpen : undefined}
            onClick={() => (p.why!.onClick ? p.why!.onClick() : setWhyOpen(!whyOpen))}
          >
            {p.why.label}
          </button>
        ) : null}
        {p.secondary?.map((b, i) => (
          <Btn key={i} b={b} variant="secondary" />
        ))}
        {p.later ? (
          <button type="button" className="as-textbtn" onClick={p.later.onClick}>
            {p.later.label}
          </button>
        ) : null}
      </div>
    </article>
  );
}
