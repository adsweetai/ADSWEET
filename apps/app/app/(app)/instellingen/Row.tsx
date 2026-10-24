import type { ReactNode } from "react";
import { Icon, type IconName } from "@adsweet/ui";

/** Een rij in Instellingen: titel, uitleg en rechts een badge, schakelaar of knoppen. */
export function Row({ title, sub, icon, children }: { title: ReactNode; sub?: ReactNode; icon?: IconName; children?: ReactNode }) {
  return (
    <div className="st-row">
      <span className="st-row__main">
        {icon ? (
          <span className="st-row__icon" aria-hidden="true">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <span className="st-row__text">
          <span className="st-row__t">{title}</span>
          {sub ? <span className="st-row__s">{sub}</span> : null}
        </span>
      </span>
      {children ? <span className="st-row__side">{children}</span> : null}
    </div>
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return <div className="st-rows">{children}</div>;
}
