import { getTranslations } from "next-intl/server";
import { Head, Table } from "@/components/Head";
import { loadCodes } from "@/lib/server/data";
import { NewCode } from "./NewCode";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("kortingscodes") };
}

// Kortingscodes (Beheer.dc.html#codes): founding members, doorverwijzingen en partners.
export default async function CodesPage() {
  const codes = await loadCodes();
  const t = await getTranslations("codes");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  const discount = (c: (typeof codes)[number]) =>
    c.kind === "founding" && c.percent_off
      ? t("founding", { p: c.percent_off })
      : c.kind === "doorverwijzing" && c.months_free
        ? t("referral", { m: c.months_free })
        : c.kind === "partner" && c.percent_off
          ? t("partner", { p: c.percent_off })
          : c.percent_off
            ? t("percent", { p: c.percent_off })
            : t("none");
  return (
    <>
      <Head title={tn("kortingscodes")} intro={ti("kortingscodes")} />
      <section className="bh-section">
        {codes.length ? (
          <Table cols={t.raw("cols") as string[]}>
            {codes.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.code}</td>
                <td>{t(`kinds.${c.kind}`)}</td>
                <td>{discount(c)}</td>
                <td>{c.max_uses ? t("used", { n: c.uses, max: c.max_uses }) : c.uses}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="bh-note">{t("empty")}</p>
        )}
      </section>
      <NewCode />
    </>
  );
}
