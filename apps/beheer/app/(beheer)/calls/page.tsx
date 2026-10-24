import { getTranslations } from "next-intl/server";
import { Badge, Cell, Head, Table } from "@/components/Head";
import { loadCalls } from "@/lib/server/data";
import { CallActions } from "./CallActions";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("calls") };
}

// Calls (Beheer.dc.html#calls): onboardinggesprekken en kwartaalcalls die klanten in Hulp aanvroegen.
export default async function CallsPage() {
  const rows = await loadCalls();
  const t = await getTranslations("calls");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  const tone = { te_plannen: "warn", gepland: "ok", gedaan: "neutral" } as const;
  return (
    <>
      <Head title={tn("calls")} intro={ti("calls")} />
      <section className="bh-section">
        {rows.length ? (
          <Table cols={t.raw("cols") as string[]} wide>
            {rows.map((c) => (
              <tr key={c.id}>
                <Cell>{c.when ?? t("toPlan")}</Cell>
                <td>{c.client}</td>
                <td>{t(`kinds.${c.kind}`)}</td>
                <td>{t("with")}</td>
                <td>
                  <Badge tone={tone[c.status]}>{t(`status.${c.status}`)}</Badge>
                </td>
                <td>{c.status !== "gedaan" ? <CallActions id={c.id} client={c.client} status={c.status} /> : null}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="bh-note">{t("none")}</p>
        )}
      </section>
    </>
  );
}
