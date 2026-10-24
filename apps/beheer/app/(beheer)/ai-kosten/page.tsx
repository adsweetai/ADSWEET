import { getTranslations } from "next-intl/server";
import { formatNumber } from "@adsweet/ui";
import { Cell, Head, Table } from "@/components/Head";
import { eur, loadAiCosts } from "@/lib/server/data";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("ai-kosten") };
}

const PLAN = { starter: "Starter", pro: "Pro", scale: "Scale", agency: "Agency" } as const;

// AI-kosten (Beheer.dc.html#aikosten): credits per account en de marge per plan. Zonder kostdata: plaatshouders.
export default async function AiCostsPage() {
  const vm = await loadAiCosts();
  const t = await getTranslations("aicosts");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  return (
    <>
      <Head title={tn("ai-kosten")} intro={ti("ai-kosten")} />
      <section className="bh-section">
        {vm.rows.length ? (
          <Table cols={t.raw("cols") as string[]}>
            {vm.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{t("used", { used: r.used, total: formatNumber(r.total) })}</td>
                <Cell>{r.cost === null ? (r.used ? t("costUnknown") : eur(0)) : eur(Math.round(r.cost * 100) / 100)}</Cell>
                <Cell>{r.models.length ? r.models.join(", ") : r.used ? t("modelUnknown") : "–"}</Cell>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="bh-note">{t("none")}</p>
        )}
      </section>
      <section className="bh-section">
        <h2>{t("planTitle")}</h2>
        <Table cols={t.raw("planCols") as string[]}>
          {vm.plans.map((p) => (
            <tr key={p.plan}>
              <td>{PLAN[p.plan]}</td>
              <td>{p.plan === "agency" ? t("from", { price: eur(p.price) }) : eur(p.price)}</td>
              <td>{formatNumber(p.credits)}</td>
              <Cell>{p.cost === null ? t("costPh") : eur(Math.round(p.cost * 100) / 100)}</Cell>
              <Cell>{p.margin === null ? t("marginPh") : eur(Math.round(p.margin * 100) / 100)}</Cell>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}
