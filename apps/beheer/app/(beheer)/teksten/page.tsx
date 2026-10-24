import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, Head, Table } from "@/components/Head";
import { loadTexts } from "@/lib/server/data";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("teksten") };
}

// Teksten en vertalingen (Beheer.dc.html#teksten): alle sleutels van de app in NL, FR en EN.
export default async function TextsPage({ searchParams }: { searchParams: Promise<{ q?: string; ontbrekend?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const missingOnly = sp.ontbrekend === "1";
  const vm = await loadTexts(q, missingOnly);
  const t = await getTranslations("texts");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  const tc = await getTranslations("common");
  const href = (missing: boolean) => `/teksten?${new URLSearchParams({ ...(q ? { q } : {}), ...(missing ? { ontbrekend: "1" } : {}) })}`;
  const cell = (v: string) => (v ? v : <Badge tone="act">{tc("missing")}</Badge>);
  return (
    <>
      <Head title={tn("teksten")} intro={ti("teksten")} />
      <div className="bh-chips">
        <Link href={href(false)} aria-pressed={!missingOnly}>
          {t("chips.all")}
        </Link>
        <Link href={href(true)} aria-pressed={missingOnly}>
          {t("chips.missing")}
        </Link>
      </div>
      <form className="bh-inline" action="/teksten">
        <div className="as-field" style={{ flex: "1 1 320px", maxWidth: 480 }}>
          <label className="as-field__label" htmlFor="tx-q">
            {t("search")}
          </label>
          <input id="tx-q" name="q" type="search" className="as-input" defaultValue={q} />
        </div>
        {missingOnly ? <input type="hidden" name="ontbrekend" value="1" /> : null}
      </form>
      <p className="as-muted" style={{ margin: 0 }}>
        {t("count", { count: vm.count, total: vm.total, missing: vm.missing })}
      </p>
      <section className="bh-section">
        <Table cols={t.raw("cols") as string[]} wide>
          {vm.rows.map((r) => (
            <tr key={r.key}>
              <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>{r.key}</td>
              <td>{r.nl}</td>
              <td>{cell(r.fr)}</td>
              <td>{cell(r.en)}</td>
            </tr>
          ))}
        </Table>
        {vm.count > vm.rows.length ? <p className="as-muted">{t("more", { n: vm.rows.length })}</p> : null}
      </section>
      <p className="bh-note">{t("note")}</p>
    </>
  );
}
