import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type StatusKind = "ok" | "warn" | "act";
const STATUS_ICON: Record<StatusKind, IconName> = { ok: "ok", warn: "warn", act: "act" };

/** Statusbadge: altijd icoon en woord, nooit alleen kleur. */
export function StatusBadge({
  kind,
  children,
  size = "lg",
}: {
  kind: StatusKind;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={["as-badge", `as-badge--${kind}`, size !== "lg" && `as-badge--${size}`]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon name={STATUS_ICON[kind]} size={size === "sm" ? 12 : size === "md" ? 13 : 14} />
      {children}
    </span>
  );
}

export type AdLabelKind = "winnaar" | "geen" | "verliezer" | "vroeg" | "rapport";
const LABEL_STYLE: Record<AdLabelKind, { icon: IconName; tone: "ok" | "act" | "neutral" }> = {
  winnaar: { icon: "check", tone: "ok" },
  geen: { icon: "minus", tone: "neutral" },
  verliezer: { icon: "act", tone: "act" },
  vroeg: { icon: "hourglass", tone: "neutral" },
  rapport: { icon: "chart", tone: "neutral" },
};

/** Advertentielabel: Winnaar (vinkje), Verliezer (uitroepteken), de rest neutraal. */
export function AdLabel({
  kind,
  children,
  size = "lg",
}: {
  kind: AdLabelKind;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const s = LABEL_STYLE[kind];
  return (
    <span
      className={["as-badge", `as-badge--${s.tone}`, size !== "lg" && `as-badge--${size}`]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon name={s.icon} size={size === "sm" ? 12 : 13} />
      {children}
    </span>
  );
}

/** "Voorstel van AdSweet" met een punt: robijn voor de bovenste kaart, anders ink-muted. */
export function ProposalLabel({ robijn, children }: { robijn?: boolean; children: ReactNode }) {
  return (
    <span className={["as-proposal", robijn && "as-proposal--robijn"].filter(Boolean).join(" ")}>
      <span className="as-proposal__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Klein label met haarlijn, bv. "Voorbeeld". */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="as-tag">{children}</span>;
}

export type Phase = "top" | "middle" | "bottom";
export const PHASE_LABEL: Record<Phase, string> = { top: "Top", middle: "Middle", bottom: "Bottom" };

export function PhasePill({ phase, size = "md" }: { phase: Phase; size?: "sm" | "md" }) {
  return (
    <span
      className={["as-phase", `as-phase--${phase}`, size === "sm" && "as-phase--sm"]
        .filter(Boolean)
        .join(" ")}
    >
      {PHASE_LABEL[phase]}
    </span>
  );
}

export type SeriesColor = "tarwe" | "staal" | "lavendel" | "salie" | "klei" | "roos";

export function Avatar({
  initial,
  color,
  size = 30,
}: {
  initial: string;
  color: SeriesColor;
  size?: number;
}) {
  return (
    <span
      className={`as-avatar as-bg--${color}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

const DOTS = ["roos", "citroen", "munt"] as const;

/** Eyebrow in de app: drie snoepbolletjes en hoofdletters. Met `line` het lijntje van de website. */
export function Eyebrow({
  children,
  line,
  dots = DOTS,
}: {
  children: ReactNode;
  line?: boolean;
  dots?: readonly string[];
}) {
  return (
    <p className={["as-eyebrow", line && "as-eyebrow--line"].filter(Boolean).join(" ")}>
      {line ? null : (
        <span className="as-eyebrow__dots" aria-hidden="true">
          {dots.map((d) => (
            <span key={d} className={`as-dot--${d}`} />
          ))}
        </span>
      )}
      {children}
    </p>
  );
}
