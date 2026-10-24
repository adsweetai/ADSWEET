import { getTranslations } from "next-intl/server";
import { Badge, Head, Table } from "@/components/Head";
import { loadAcademy } from "@/lib/server/data";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("academy") };
}

// Academy (Beheer.dc.html#academy): de lessen met hun status.
export default async function AcademyAdminPage() {
  const rows = await loadAcademy();
  const t = await getTranslations("academyAdmin");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  return (
    <>
      <Head title={tn("academy")} intro={ti("academy")} />
      <section className="bh-section">
        <Table cols={t.raw("cols") as string[]}>
          {rows.map((r) => (
            <tr key={r.track + r.lesson}>
              <td>{r.track}</td>
              <td>{r.lesson}</td>
              <td>{r.written ? <Badge tone="warn">{t("written")}</Badge> : <Badge tone="act">{t("todo")}</Badge>}</td>
              <td>{r.written ? t("minutes") : "–"}</td>
            </tr>
          ))}
        </Table>
      </section>
      <p className="bh-note">{t("note")}</p>
    </>
  );
}
