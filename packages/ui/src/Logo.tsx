export interface LogoProps {
  /** 19px op de computer, 17px op de gsm. */
  height?: number;
  alt?: string;
}

/** Het woordmerk. In nacht de lichte versie. Nooit natypen. */
export function Logo({ height = 19, alt = "adsweet" }: LogoProps) {
  return (
    <span className="as-logo" style={{ height }}>
      <img className="as-logo__light" src="/adsweet-logo.svg" alt={alt} height={height} />
      <img className="as-logo__dark" src="/adsweet-logo-licht.svg" alt={alt} height={height} />
    </span>
  );
}
