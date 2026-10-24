import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppToastProvider } from "@/components/ui";
import { Showcase } from "./Showcase";
import "./onderdelen.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onderdelen");
  return { title: t("title"), robots: { index: false } };
}

/** /_onderdelen: alle onderdelen uit packages/ui, in licht en nacht naast elkaar. */
export default function ComponentsPage() {
  return (
    <AppToastProvider>
      <Showcase />
    </AppToastProvider>
  );
}
