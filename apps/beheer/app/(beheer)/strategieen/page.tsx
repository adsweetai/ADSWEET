import { getTranslations } from "next-intl/server";
import { Badge, Head, Table } from "@/components/Head";
import { requireAdmin } from "@/lib/server/auth";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("strategieen") };
}

// Strategieën (Beheer.dc.html#strategieen): de keuzekaarten van de campagnewizard.
export default async function StrategiesPage() {
  await requireAdmin();
  const t = await getTranslations("strategies");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  return (
    <>
      <Head title={tn("strategieen")} intro={ti("strategieen")} />
      <section className="bh-section">
        <Table cols={t.raw("cols") as string[]}>
          {(t.raw("rows") as [string, string, string, "ok" | "warn"][]).map(([name, sectors, goals, st]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{sectors}</td>
              <td>{goals}</td>
              <td>
                <Badge tone={st}>{t(`status.${st}`)}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}
