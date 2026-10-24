import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "@adsweet/ui";

/** Een knop die naar een andere pagina in de app gaat (next/link met de stijl van Button). */
export function LinkButton({
  variant = "secondary",
  icon,
  arrow,
  children,
  className,
  ...rest
}: Omit<ComponentProps<typeof Link>, "children"> & { variant?: "primary" | "secondary"; icon?: IconName; arrow?: boolean; children: ReactNode }) {
  const withArrow = arrow ?? false;
  return (
    <Link className={["as-btn", `as-btn--${variant}`, withArrow && variant === "primary" && "as-btn--arrow", className].filter(Boolean).join(" ")} {...rest}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
      {withArrow ? <Icon name="arrow" size={14} /> : null}
    </Link>
  );
}
