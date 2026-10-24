import { formatNumber } from "@adsweet/ui";

// Kleine grafieken in SVG (Inzichten). Kleuren via de tokens: de lijn neemt currentColor van de klasse.

export type ChartTone = "ink" | "ok" | "act" | "warn";

/** Sparkline onder een tegel: lijn met een licht vlak en een punt op de laatste waarde. */
export function Sparkline({ values, tone = "ink" }: { values: number[]; tone?: ChartTone }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 26;
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const y = (v: number) => h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 6);
  const pts = values.map((v, i) => [i * (w / (values.length - 1)), y(v)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className={`ch ch--${tone}`} width="100%" height={28} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${w} ${h} L0 ${h} Z`} className="ch-area" />
      <path d={d} className="ch-line" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.4} className="ch-dot" />
    </svg>
  );
}

/** Trend per dag: een lijn over staven met de uitgaven, met optioneel een referentielijn (break-even). */
export function TrendChart({
  line,
  bars,
  labels,
  refLine,
  refLabel,
  format,
  tone = "ink",
}: {
  line: number[];
  bars: number[];
  labels: string[];
  refLine?: number | null;
  refLabel?: string;
  format: "roas" | "euro" | "pct";
  tone?: ChartTone;
}) {
  const W = 520;
  const H = 200;
  const L = 40;
  const B = 24;
  const T = 10;
  const n = line.length;
  if (!n) return null;
  const mxL = Math.max(...line, refLine ?? 0, 0.0001) * 1.15;
  const mxS = Math.max(...bars, 0.0001) * 1.1;
  const bw = (W - L) / n;
  const y = (v: number) => T + (H - T - B) * (1 - v / mxL);
  const ys = (v: number) => H - B - (H - T - B) * (v / mxS);
  const px = (i: number) => L + bw * i + bw / 2;
  const pts = line.map((v, i) => [px(i), y(v)] as const);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < n; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  const fmt = (v: number) => (format === "euro" ? `€${Math.round(v)}` : format === "pct" ? `${formatNumber(v, 1)}%` : formatNumber(v, 1));
  const grid = [0, 0.5, 1].map((f) => mxL * (f / 1.15));
  return (
    <svg className={`ch ch--${tone}`} width="100%" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={L} x2={W} y1={y(g)} y2={y(g)} className="ch-grid" />
          <text x={L - 6} y={y(g) + 4} textAnchor="end" className="ch-text">
            {fmt(g)}
          </text>
        </g>
      ))}
      {bars.map((v, i) => (
        <rect key={i} x={L + bw * i + bw * 0.18} y={ys(v)} width={bw * 0.64} height={Math.max(0, H - B - ys(v))} rx={4} className="ch-bar" />
      ))}
      {refLine ? (
        <g>
          <line x1={L} x2={W} y1={y(refLine)} y2={y(refLine)} className="ch-ref" />
          <text x={L + 6} y={y(refLine) - 5} className="ch-text ch-text--ink">
            {refLabel}
          </text>
        </g>
      ) : null}
      <path d={`${d} L${pts[n - 1][0]} ${H - B} L${pts[0][0]} ${H - B} Z`} className="ch-area" />
      <path d={d} className="ch-line ch-line--thick" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} className="ch-dot" />
      ))}
      {labels.map((l, i) => (
        <text key={l + i} x={px(i)} y={H - 6} textAnchor="middle" className="ch-text">
          {l}
        </text>
      ))}
    </svg>
  );
}
