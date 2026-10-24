import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PreviewBoard } from "@/components/ads/PreviewBoard";
import { loadPublicPreview } from "@/lib/server/campaign-changes";
import "../../(app)/campagnes/campagnes.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("previewLink");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Openbare preview-pagina (V1): advertenties nakijken zonder account. */
export default async function PublicPreviewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await loadPublicPreview(code);
  if (!data) notFound();
  return (
    <main className="pl-public">
      <div className="pl-public__inner">
        <PreviewBoard data={data} interactive />
      </div>
    </main>
  );
}
