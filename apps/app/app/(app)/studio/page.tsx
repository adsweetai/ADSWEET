import { getTranslations } from "next-intl/server";
import { EmptyPage } from "@/components/EmptyPage";
import { routeMetadata } from "@/lib/meta";

export const generateMetadata = routeMetadata("studio");

export default async function Page() {
  const t = await getTranslations("gates");
  return <EmptyPage min="pro" gateText={t("studio")} />;
}
