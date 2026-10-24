import { getTranslations } from "next-intl/server";
import { Badge, Head, Table } from "@/components/Head";
import { FOUNDING_LIMIT, loadClients } from "@/lib/server/data";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("klanten") };
}

const PLAN = { starter: "Starter", pro: "Pro", scale: "Scale", agency: "Agency" } as const;

// Klanten (Beheer.dc.html#klanten): elk betalend account met plan, proefperiode, founding, betaling en koppelingen.
export default async function ClientsPage() {
  const vm = await loadClients();
  const t = await getTranslations("clients");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  return (
    <>
      <Head title={tn("klanten")} intro={ti("klanten", { n: vm.founding, max: FOUNDING_LIMIT })} />
      <section className="bh-section">
        <Table cols={t.raw("cols") as string[]} wide>
          {vm.rows.map((r) => (
            <tr key={r.id}>
              <td style={{ fontWeight: 500 }}>{r.name}</td>
              <td>{PLAN[r.plan]}</td>
              <td>{r.period}</td>
              <td>{r.trialDay}</td>
              <td>{r.founding ? t("yes") : t("no")}</td>
              <td>{r.pays}</td>
              <td>{r.lastSeen}</td>
              <td>
                <Badge tone={r.status.tone}>{r.status.text}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <p className="bh-note">{t("note")}</p>
    </>
  );
}
