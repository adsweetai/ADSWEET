import type { ReactNode } from "react";
import { Icon } from "./Icon";

export interface MeterProps {
  value: number;
  max: number;
  label: string;
  thin?: boolean;
  /** progressbar voor voortgang, meter voor een stand (credits). */
  role?: "meter" | "progressbar";
  min?: number;
}

export function Meter({ value, max, label, thin, role = "meter", min = 0 }: MeterProps) {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div
      role={role}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={["as-meter", thin && "as-meter--thin"].filter(Boolean).join(" ")}
    >
      <div className="as-meter__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Creditsmeter: "Nog 18 van je 50 credits in je proefperiode". */
export function CreditsMeter({
  left,
  total,
  title,
  aside,
  note,
  label,
}: {
  left: number;
  total: number;
  title: ReactNode;
  aside?: ReactNode;
  note?: ReactNode;
  label: string;
}) {
  return (
    <div className="as-meterbox">
      <div className="as-meterbox__top">
        <span style={{ fontWeight: 500 }}>{title}</span>
        {aside ? (
          <span className="as-small" style={{ fontSize: 12.5 }}>
            {aside}
          </span>
        ) : null}
      </div>
      <Meter value={left} max={total} label={label} />
      {note ? <span className="as-small">{note}</span> : null}
    </div>
  );
}

/** Voortgang van de onboarding: "Stap 3 van 11". */
export function ProgressBox({
  title,
  aside,
  value,
  max,
  label,
  note,
}: {
  title: ReactNode;
  aside?: ReactNode;
  value: number;
  max: number;
  label: string;
  note?: ReactNode;
}) {
  return (
    <div className="as-meterbox">
      <div className="as-meterbox__top">
        <span style={{ fontWeight: 500 }}>{title}</span>
        {aside ? (
          <span className="as-small" style={{ fontSize: 12.5 }}>
            {aside}
          </span>
        ) : null}
      </div>
      <Meter value={value} max={max} min={0} label={label} thin role="progressbar" />
      {note ? <span className="as-small">{note}</span> : null}
    </div>
  );
}

/** Proefperiodebalk: dun, bovenaan. Vanaf dag 27 in Let op. */
export function TrialBar({ text, link, warn }: { text: ReactNode; link: { label: ReactNode; href: string }; warn?: boolean }) {
  return (
    <div role="status" className={["as-trialbar", warn && "as-trialbar--warn"].filter(Boolean).join(" ")}>
      <span className="as-trialbar__text">
        {warn ? <Icon name="warn" size={15} /> : null}
        {text}
      </span>
      <a href={link.href}>{link.label}</a>
    </div>
  );
}
