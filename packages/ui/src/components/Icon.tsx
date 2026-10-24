import { createElement } from "react";
import { ICONS, type IconName } from "../icons";

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Alleen als het icoon alleen staat en betekenis draagt. Anders verborgen voor schermlezers. */
  label?: string;
}

export function Icon({ name, size = 16, strokeWidth = 1.5, className, label }: IconProps) {
  return (
    <svg
      className={["as-icon", className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      {ICONS[name].map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

export type { IconName };
