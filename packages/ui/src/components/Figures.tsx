import { Fragment, type ReactNode } from "react";
import {
  AdLabel,
  PhasePill,
  StatusBadge,
  Tag,
  type AdLabelKind,
  type Phase,
  type StatusKind,
} from "./Badges";
import { Icon } from "./Icon";

export interface EuroBlock {
  label: ReactNode;
  value: ReactNode;
}

export interface EuroTileProps {
  /** Webshop: Uitgegeven → Verkopen → Omzet → ROAS. Aanvragen: Uitgegeven → Aanvragen → Kost per aanvraag. */
  blocks: EuroBlock[];
  /** Bv. "Laatste 7 dagen" */
  caption?: ReactNode;
  /** Bv. "Voorbeeld" */
  tag?: ReactNode;
  /** Bv. "Je break-even is 2,5" */
  note?: ReactNode;
  status?: { kind: StatusKind; label: ReactNode };
  label?: string;
  /** Kleinere blokken (bv. in een campagne). */
  minBlock?: number;
}

/** EuroTegel: blokken op een rij met een dunne pijl ertussen. Het laatste blok valt op door een haarlijn in ink. */
export function EuroTile({ blocks, caption, tag, note, status, label, minBlock = 110 }: EuroTileProps) {
  return (
    <section className="as-eurotile" aria-label={label}>
      <div className="as-eurotile__row">
        {blocks.map((b, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <span className="as-eurotile__arrow" aria-hidden="true">
                <Icon name="arrow" size={14} />
              </span>
            ) : null}
            <div
              className={["as-eurotile__block", i === blocks.length - 1 && "as-eurotile__block--last"]
                .filter(Boolean)
                .join(" ")}
              style={{ flexBasis: minBlock }}
            >
              <span className="as-eurotile__k">{b.label}</span>
              <span className="as-eurotile__v">{b.value}</span>
            </div>
          </Fragment>
        ))}
      </div>
      {caption || note || status ? (
        <div className="as-eurotile__foot">
          <span className="as-eurotile__label">
            {caption}
            {tag ? <Tag>{tag}</Tag> : null}
          </span>
          {note || status ? (
            <span className="as-eurotile__note">
              {note}
              {status ? <StatusBadge kind={status.kind}>{status.label}</StatusBadge> : null}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export interface AdCardProps {
  name: ReactNode;
  kind: "foto" | "video";
  phase: Phase;
  label: { kind: AdLabelKind; text: ReactNode };
  metrics: { k: ReactNode; v: ReactNode }[];
  thumb?: string;
  onClick?: () => void;
  href?: string;
  extra?: ReactNode;
}

/** Advertentiekaart: miniatuur, naam, funnelfase, label en de twee belangrijkste cijfers. */
export function AdCard({ name, kind, phase, label, metrics, thumb, onClick, href, extra }: AdCardProps) {
  const body = (
    <>
      <span className="as-thumb" aria-hidden="true">
        {thumb ? <img src={thumb} alt="" /> : <Icon name={kind === "video" ? "video" : "image"} size={16} />}
      </span>
      <span className="as-adcard__body">
        <span className="as-adcard__name">{name}</span>
        <span className="as-adcard__chips">
          <PhasePill phase={phase} size="sm" />
          <AdLabel kind={label.kind} size="sm">
            {label.text}
          </AdLabel>
          {extra}
        </span>
        <span className="as-adcard__metrics">
          {metrics.map((m, i) => (
            <span key={i}>
              <span className="k">{m.k}</span> {m.v}
            </span>
          ))}
        </span>
      </span>
    </>
  );
  if (href)
    return (
      <a className="as-adcard" href={href}>
        {body}
      </a>
    );
  if (onClick)
    return (
      <button type="button" className="as-adcard" onClick={onClick}>
        {body}
      </button>
    );
  return <div className="as-adcard">{body}</div>;
}

export interface FunnelBarProps {
  counts: Record<Phase, number>;
  /** "{n} ad" / "{n} ads" */
  format: (n: number) => ReactNode;
  missing: ReactNode;
  label?: string;
}

/** Funnelbalk: drie vakken met het aantal ads per fase. Een ontbrekende fase heeft een streepjesrand. */
export function FunnelBar({ counts, format, missing, label }: FunnelBarProps) {
  return (
    <div className="as-funnel" role="list" aria-label={label}>
      {(["top", "middle", "bottom"] as Phase[]).map((p) => {
        const n = counts[p] ?? 0;
        return (
          <div
            role="listitem"
            key={p}
            className={["as-funnel__cell", n ? `as-phase--${p}` : "as-funnel__cell--missing"].join(" ")}
          >
            <span>{p[0].toUpperCase() + p.slice(1)}</span>
            <b>{n ? format(n) : missing}</b>
          </div>
        );
      })}
    </div>
  );
}
