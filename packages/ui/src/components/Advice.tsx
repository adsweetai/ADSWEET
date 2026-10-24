import type { ReactNode } from "react";
import { Icon } from "./Icon";

export interface WarningBlockProps {
  /** "Pas op, dit raden we niet aan." */
  title: ReactNode;
  /** De reden, in één of twee zinnen. */
  children: ReactNode;
  /** Link "Waarom?" naar de Academy. */
  why?: { label: ReactNode; href: string };
  /** Knop "Toch doorgaan". Weg als de klant al koos. */
  proceed?: { label: ReactNode; onClick: () => void };
}

/** Waarschuwingsblok bij elke afwijking van het playbook. Gebruikt Actie nodig, nooit robijn. */
export function WarningBlock({ title, children, why, proceed }: WarningBlockProps) {
  return (
    <div role="alert" className="as-warning">
      <Icon name="act" size={18} />
      <div className="as-warning__body">
        <b className="as-warning__title">{title}</b>
        <span className="as-warning__text">{children}</span>
        {why || proceed ? (
          <div className="as-warning__actions">
            {why ? (
              <a className="as-link" href={why.href}>
                {why.label}
              </a>
            ) : null}
            {proceed ? (
              <button type="button" className="as-btn as-btn--secondary as-btn--small" onClick={proceed.onClick}>
                {proceed.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Tipkaart: lampje, "Tip uit het playbook", één of twee zinnen en "Meer in de Academy". */
export function TipCard({ label, children, more }: { label: ReactNode; children: ReactNode; more?: { label: ReactNode; href: string } }) {
  return (
    <aside className="as-tipcard">
      <span className="as-tipcard__label">
        <Icon name="bulb" size={16} />
        {label}
      </span>
      <p className="as-tipcard__text">{children}</p>
      {more ? (
        <a className="as-link" href={more.href}>
          {more.label}
        </a>
      ) : null}
    </aside>
  );
}

/** Tip binnen een kaart: lampje en één regel in ink-muted. */
export function TipLine({ children }: { children: ReactNode }) {
  return (
    <p className="as-tipline">
      <Icon name="bulb" size={16} />
      <span>{children}</span>
    </p>
  );
}
