import { getTranslations } from "next-intl/server";
import { Badge, Cell, Head, Table } from "@/components/Head";
import { loadSystem } from "@/lib/server/data";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("systeem") };
}

// Systeemstatus (Beheer.dc.html#systeem): koppelingen en de laatste run van de geplande taken, uit de data.
export default async function SystemPage() {
  const s = await loadSystem();
  const t = await getTranslations("system");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  const conn = (c: { total: number; bad: number }) =>
    !c.total ? <Badge tone="neutral">{t("none")}</Badge> : c.bad ? <Badge tone="act">{t("expired", { n: c.bad })}</Badge> : <Badge tone="ok">{t("ok")}</Badge>;
  const run = (at: string | null) => (at ? <Badge tone="ok">{t("ok")}</Badge> : <Badge tone="neutral">{t("planned")}</Badge>);
  return (
    <>
      <Head title={tn("systeem")} intro={ti("systeem")} />
      <section className="bh-section">
        <Table cols={t.raw("cols") as string[]}>
          <tr>
            <td>{t("meta")}</td>
            <td>{conn(s.meta)}</td>
            <td>–</td>
            <td>{t("limit", { n: s.meta.total })}</td>
          </tr>
          <tr>
            <td>{t("google")}</td>
            <td>{conn(s.google)}</td>
            <td>–</td>
            <td>{t("limit", { n: s.google.total })}</td>
          </tr>
          <tr>
            <td>{t("audit")}</td>
            <td>{run(s.audit)}</td>
            <Cell>{s.audit ?? t("unknown")}</Cell>
            <td>{t("all")}</td>
          </tr>
          <tr>
            <td>{t("autopilot")}</td>
            <td>{run(s.autopilot)}</td>
            <Cell>{s.autopilot ?? t("unknown")}</Cell>
            <td>{t("within")}</td>
          </tr>
          <tr>
            <td>{t("notifications")}</td>
            <td>{run(s.notifications)}</td>
            <Cell>{s.notifications ?? t("unknown")}</Cell>
            <td>{t("appMail")}</td>
          </tr>
          <tr>
            <td>{t("reports")}</td>
            <td>{run(null)}</td>
            <Cell>{t("unknown")}</Cell>
            <td>{t("perMail")}</td>
          </tr>
        </Table>
      </section>
    </>
  );
}
