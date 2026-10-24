import type { ReactNode } from "react";
import type { Tone } from "@/lib/server/data";

/** Titel en uitleg van een onderdeel, met rechts de knoppen. */
export function Head({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <header className="bh-head">
      <div className="bh-head__text">
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {children ? <div className="bh-actions">{children}</div> : null}
    </header>
  );
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`bh-badge bh-badge--${tone}`}>{children}</span>;
}

/** Tabel zoals in Beheer.dc.html: kop in de verzonken kleur, rijen met een lijn. */
export function Table({ cols, children, wide }: { cols: string[]; children: ReactNode; wide?: boolean }) {
  return (
    <div className="bh-tablewrap">
      <table className={wide ? "bh-table bh-table--wide" : "bh-table"}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Een cel met een plaatshouder [zoals dit] staat gedempt. */
export function Cell({ children }: { children: ReactNode }) {
  const ph = typeof children === "string" && /^\[/.test(children);
  return <td className={ph ? "bh-ph" : undefined}>{children}</td>;
}
