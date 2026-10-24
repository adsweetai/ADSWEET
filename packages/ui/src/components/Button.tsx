import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary";

interface Common {
  variant?: Variant;
  /** Groot (46px) voor de website en inloggen, standaard 40px in de app. */
  size?: "app" | "site" | "small";
  /** Pijltje rechts dat bij hover 3px opschuift. Standaard bij primair. */
  arrow?: boolean;
  /** Slotje bij een functie buiten het plan. */
  locked?: boolean;
  block?: boolean;
  icon?: IconName;
  children: ReactNode;
}

function classes({ variant = "primary", size = "app", arrow, block }: Common, extra?: string) {
  const withArrow = arrow ?? variant === "primary";
  return [
    "as-btn",
    `as-btn--${variant}`,
    size === "site" && "as-btn--site",
    size === "small" && "as-btn--small",
    withArrow && variant === "primary" && "as-btn--arrow",
    block && "as-btn--block",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function Inner({ variant = "primary", arrow, locked, icon, children }: Common) {
  const withArrow = arrow ?? variant === "primary";
  return (
    <>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
      {locked ? (
        <span className="as-btn__lock">
          <Icon name="lock" size={13} />
        </span>
      ) : null}
      {withArrow && variant === "primary" ? <Icon name="arrow" size={14} /> : null}
    </>
  );
}

export type ButtonProps = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  variant,
  size,
  arrow,
  locked,
  block,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const c = { variant, size, arrow, locked, block, icon, children };
  return (
    <button type={type} className={classes(c, className)} {...rest}>
      <Inner {...c} />
    </button>
  );
}

export type ButtonLinkProps = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children">;

export function ButtonLink({
  variant,
  size,
  arrow,
  locked,
  block,
  icon,
  children,
  className,
  ...rest
}: ButtonLinkProps) {
  const c = { variant, size, arrow, locked, block, icon, children };
  return (
    <a className={classes(c, className)} {...rest}>
      <Inner {...c} />
    </a>
  );
}

export interface TextButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  arrow?: boolean;
  icon?: IconName;
  children: ReactNode;
}

/** Tekstknop: tekst met een haarlijn eronder. */
export function TextButton({ arrow, icon, children, className, type = "button", ...rest }: TextButtonProps) {
  return (
    <button
      type={type}
      className={["as-textbtn", arrow && "as-textbtn--arrow", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
      {arrow ? <Icon name="arrow" size={14} /> : null}
    </button>
  );
}

export interface TextLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  arrow?: boolean;
  children: ReactNode;
}

export function TextLink({ arrow, children, className, ...rest }: TextLinkProps) {
  return (
    <a
      className={["as-textbtn", arrow && "as-textbtn--arrow", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
      {arrow ? <Icon name="arrow" size={14} /> : null}
    </a>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  label: string;
  plain?: boolean;
  size?: number;
}

export function IconButton({
  icon,
  label,
  plain,
  size = 18,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={["as-iconbtn", plain && "as-iconbtn--plain", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
