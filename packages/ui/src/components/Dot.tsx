// Dot: het robijnrode puntje uit het logo met oogjes, wangetjes en glans (design/dot.js).
// De naam staat in één constante, want hij kan nog veranderen.

export const ASSISTANT_NAME = "Dot";

export type DotMood = "rust" | "blij" | "praat" | "denkt" | "knipoog" | "viert";

const CANDY = ["roos", "citroen", "munt", "bes", "hemel", "perzik"];

function EyesOpen({ dx = 0, dy = 0 }: { dx?: number; dy?: number }) {
  return (
    <>
      <ellipse className="as-dotchar__ink" cx={40 + dx} cy={50 + dy} rx="4.6" ry="6" />
      <ellipse className="as-dotchar__ink" cx={60 + dx} cy={50 + dy} rx="4.6" ry="6" />
      <circle className="as-dotchar__shine" cx={41.6 + dx} cy={47.8 + dy} r="1.6" />
      <circle className="as-dotchar__shine" cx={61.6 + dx} cy={47.8 + dy} r="1.6" />
    </>
  );
}

const Arc = ({ x }: { x: number }) => (
  <path className="as-dotchar__inkline" d={`M${x - 5.5} 51 Q${x} 44.5 ${x + 5.5} 51`} strokeWidth="3.4" />
);

function Mouth({ mood }: { mood: DotMood }) {
  switch (mood) {
    case "blij":
    case "viert":
      return (
        <>
          <path className="as-dotchar__ink" d="M42 60 Q50 73 58 60 Z" />
          <path className="as-dotchar__cheek" d="M45.5 66 Q50 69.5 54.5 66" />
        </>
      );
    case "praat":
      return <ellipse className="as-dotchar__ink tk" cx="50" cy="63" rx="5" ry="3.8" />;
    case "denkt":
      return <path className="as-dotchar__inkline" d="M44.5 63.5 Q50 61 55.5 63" strokeWidth="3" />;
    case "knipoog":
      return <path className="as-dotchar__inkline" d="M43 60.5 Q50 68.5 57 60.5" strokeWidth="3" />;
    default:
      return <path className="as-dotchar__inkline" d="M43.5 61 Q50 67.5 56.5 61" strokeWidth="3" />;
  }
}

function Eyes({ mood }: { mood: DotMood }) {
  if (mood === "blij" || mood === "viert")
    return (
      <>
        <Arc x={40} />
        <Arc x={60} />
      </>
    );
  if (mood === "knipoog")
    return (
      <>
        <Arc x={40} />
        <g className="ey">
          <ellipse className="as-dotchar__ink" cx="60" cy="50" rx="4.6" ry="6" />
          <circle className="as-dotchar__shine" cx="61.6" cy="47.8" r="1.6" />
        </g>
      </>
    );
  return <g className="ey">{mood === "denkt" ? <EyesOpen dx={2.5} dy={-3} /> : <EyesOpen />}</g>;
}

export interface DotCharacterProps {
  size?: number;
  mood?: DotMood;
  /** Stilstaand, zonder beweging. */
  still?: boolean;
  /** Toegankelijke naam; zonder label is Dot decoratief. */
  label?: string;
}

export function DotCharacter({ size = 56, mood = "rust", still, label }: DotCharacterProps) {
  return (
    <span
      className={["as-dotchar", still && "as-dotchar--still"].filter(Boolean).join(" ")}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g className={mood === "viert" ? "hop" : "f"}>
          <g className="sq">
            <circle className="as-dotchar__body" cx="50" cy="50" r="40" />
            <ellipse
              className="as-dotchar__shine"
              cx="36"
              cy="30"
              rx="10"
              ry="6"
              fillOpacity=".55"
              transform="rotate(-28 36 30)"
            />
            <circle className="as-dotchar__cheek" cx="30" cy="60" r="5" fillOpacity=".85" />
            <circle className="as-dotchar__cheek" cx="70" cy="60" r="5" fillOpacity=".85" />
            <Eyes mood={mood} />
            <Mouth mood={mood} />
          </g>
          {mood === "denkt" ? (
            <g className="as-dotchar__ink" opacity=".5">
              <circle className="dt" cx="86" cy="14" r="3" />
              <circle className="dt" cx="94" cy="6" r="3.6" />
              <circle className="dt" cx="103" cy="-3" r="4.2" />
            </g>
          ) : null}
          {mood === "viert"
            ? CANDY.map((c, i) => {
                const a = (i / CANDY.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <rect
                    key={c}
                    className={`cf as-dotfill--${c}`}
                    x="48"
                    y={46 - (i % 2) * 2}
                    width={i % 2 ? 6 : 5}
                    height={i % 2 ? 6 : 8}
                    rx={i % 3 ? 3 : 1}
                    style={{
                      ["--x" as string]: `${Math.round(Math.cos(a) * 46)}px`,
                      ["--y" as string]: `${Math.round(Math.sin(a) * 40 - 8)}px`,
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                );
              })
            : null}
        </g>
      </svg>
    </span>
  );
}
