import { getTranslations } from "next-intl/server";
import { Badge, Head, Table } from "@/components/Head";
import { FIELDS } from "@/lib/playbook";
import { loadVersions } from "@/lib/server/data";
import { PublishButton, RestoreButton } from "./VersionActions";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("versies") };
}

const shown = (key: string, v: number) => {
  const f = FIELDS.find((x) => x.key === key);
  return f?.unit === "percent" ? `${String(Math.round(v * 1000) / 10).replace(".", ",")}%` : String(v).replace(".", ",");
};

// Versies (Beheer.dc.html#versies): concept en gepubliceerd, vergelijken en terugzetten.
export default async function VersionsPage() {
  const vm = await loadVersions();
  const t = await getTranslations("versions");
  const tn = await getTranslations("nav");
  const ti = await getTranslations("intro");
  const tp = await getTranslations("playbook");
  const tone = { concept: "warn", gepubliceerd: "ok", gearchiveerd: "neutral" } as const;
  return (
    <>
      <Head title={tn("versies")} intro={ti("versies")}>
        {vm.concept ? <PublishButton version={vm.concept} /> : null}
      </Head>
      {!vm.concept ? <p className="bh-note">{t("noConcept")}</p> : null}
      <section className="bh-section">
        <Table cols={t.raw("cols") as string[]}>
          {vm.rows.map((r) => (
            <tr key={r.version}>
              <td>{r.version}</td>
              <td>{r.status === "gearchiveerd" ? t("status.gearchiveerd") : <Badge tone={tone[r.status]}>{t(`status.${r.status}`)}</Badge>}</td>
              <td>{r.date}</td>
              <td>{r.note}</td>
              <td>{r.status === "gearchiveerd" ? <RestoreButton version={r.version} /> : null}</td>
            </tr>
          ))}
        </Table>
      </section>
      {vm.diff && vm.published && vm.concept ? (
        <section className="bh-section" aria-label={t("compare")}>
          <p className="bh-note">
            {t("compareText", { a: vm.published, b: vm.concept, n: vm.diff.length })}
            {vm.diff.length ? (
              <>
                <br />
                {vm.diff.map((d) => (
                  <span key={d.key} style={{ display: "block" }}>
                    {t("diffRow", { label: (tp.raw(`fields.${d.key}`) as [string, string])[0], from: shown(d.key, d.from), to: shown(d.key, d.to) })}
                  </span>
                ))}
              </>
            ) : null}
          </p>
        </section>
      ) : null}
    </>
  );
}
