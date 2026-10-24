import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PreviewBoard } from "@/components/ads/PreviewBoard";
import { env } from "@/lib/env";
import { routeMetadata } from "@/lib/meta";
import { ensurePreviewLink, loadPublicPreview } from "@/lib/server/campaign-changes";
import { CopyLink } from "./CopyLink";
import "../../campagnes.css";

export const generateMetadata = routeMetadata("previewLink");

/** Preview-link delen (V1): een link voor je vennoot, zonder account. */
export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await getTranslations("previewLink");
  const tc = await getTranslations("campaign");
  const link = await ensurePreviewLink(id);
  if (!link) notFound();
  const url = `${env.appUrl}/p/${link.code}`;
  const data = await loadPublicPreview(link.code);
  const ok = data?.ads.filter((a) => a.status === "goedgekeurd").length ?? 0;
  const notes = data?.ads.filter((a) => a.status === "opmerking") ?? [];
  return (
    <div className="cp cp--mid">
      <Link href={`/campagnes/${id}`} className="cp-back">
        {tc("backToCampaign")}
      </Link>
      <div className="pl-link">
        <span>{t("link", { url: url.replace(/^https?:\/\//, "") })}</span>
        <CopyLink url={url} />
      </div>
      {ok || notes.length ? (
        <section className="cp-section">
          <h3 className="cp-h3">{t("feedback")}</h3>
          <span className="as-muted">{t("results", { ok, notes: notes.length })}</span>
          {notes.map((n) => (
            <p key={n.id} className="wz-note">
              <b style={{ fontWeight: 500 }}>{n.title}</b> · {n.note}
            </p>
          ))}
        </section>
      ) : null}
      <span className="as-muted">{t("how")}</span>
      {data ? <PreviewBoard data={data} interactive={false} /> : null}
    </div>
  );
}
