import type { ReactNode } from "react";
import { StatusBadge } from "./Badges";
import { Icon } from "./Icon";
import { Sculpture } from "../Sculpture";

/** De lader: drie dunne lijnen die naar één robijn punt bewegen. Altijd met een zin erbij. */
export function Loader() {
  return (
    <span className="as-loader" aria-hidden="true">
      <span className="as-loader__line" />
      <span className="as-loader__line" />
      <span className="as-loader__line" />
      <span className="as-loader__dot" />
    </span>
  );
}

export function Loading({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="as-loading">
      <Loader />
      <span>{children}</span>
    </div>
  );
}

/** Lege staat: één zin in ink-muted, eventueel met de kleine stilstaande sculptuur. Geen illustraties. */
export function EmptyState({ text, sculpture = true, action, plain }: { text: ReactNode; sculpture?: boolean; action?: ReactNode; plain?: boolean }) {
  return (
    <div className={["as-empty", plain && "as-empty--plain"].filter(Boolean).join(" ")}>
      {sculpture && !plain ? <Sculpture /> : null}
      <p className="as-empty__text">{text}</p>
      {action}
    </div>
  );
}

/** Foutstaat met badge Actie nodig. */
export function ErrorState({ badge, title, text, action }: { badge: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="as-state" role="alert">
      <StatusBadge kind="act">{badge}</StatusBadge>
      <span className="as-state__title">{title}</span>
      {text ? <span className="as-state__text">{text}</span> : null}
      {action}
    </div>
  );
}

/** Gedimd paneel voor een functie buiten het plan. Geen kleur, geen robijn. */
export function PlanGatePanel({
  plan,
  title,
  text,
  action,
  static: isStatic,
}: {
  plan: ReactNode;
  title: ReactNode;
  text: ReactNode;
  action: ReactNode;
  static?: boolean;
}) {
  return (
    <div
      className={["as-gate__panel", isStatic && "as-gate__panel--static"].filter(Boolean).join(" ")}
      role="region"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <span className="as-gate__plan">
        <Icon name="lock" size={15} />
        {plan}
      </span>
      <b className="as-gate__title">{title}</b>
      <span className="as-gate__text">{text}</span>
      {action}
    </div>
  );
}

/** Het scherm gedimd met het paneel erop. De inhoud eronder is niet bedienbaar. */
export function PlanGate({ children, panel }: { children: ReactNode; panel: ReactNode }) {
  return (
    <div className="as-gate">
      <div className="as-gate__under" aria-hidden="true" inert>
        {children}
      </div>
      {panel}
    </div>
  );
}
