import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** Paginatitel uit messages/routes. */
export function routeMetadata(key: string) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("routes");
    return { title: t(key) };
  };
}
