import { getTranslations } from "next-intl/server";
import { PLAN_LIMITS } from "@adsweet/playbook";
import { Badge, Head, Table } from "@/components/Head";
import { eur, loadPartners } from "@/lib/server/data";
import { ApprovePartner } from "./ApprovePartner";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("partners") };
}

// Partners (Beheer.dc.html#partners): aanmeldingen, klanten en commissies (30% per maand, 12 maanden).
export default async function PartnersPage() {
  const rows = await loadPartners();
  const t = await getTranslations("partners");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  const tone = { aanmelding: "warn", actief: "ok", gestopt: "neutral" } as const;
  const pro = PLAN_LIMITS.pro.price;
  const month = Math.round(pro * 0.3 * 100) / 100;
  return (
    <>
      <Head title={tn("partners")} intro={ti("partners")} />
      <section className="bh-section">
        {rows.length ? (
          <Table cols={t.raw("cols") as string[]}>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <Badge tone={tone[p.status]}>{t(`status.${p.status}`)}</Badge>
                </td>
                <td>{p.clients}</td>
                <td>{eur(Math.round(p.commission * 100) / 100)}</td>
                <td>{p.status === "aanmelding" ? <ApprovePartner id={p.id} /> : null}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="bh-note">{t("none")}</p>
        )}
        <p className="bh-note">{t("example", { price: eur(pro), month: eur(month), year: eur(Math.round(month * 12 * 100) / 100) })}</p>
      </section>
    </>
  );
}
