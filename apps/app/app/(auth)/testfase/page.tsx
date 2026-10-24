import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Testfase } from "@/components/auth/Testfase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("testTitle") };
}

export default function TestfasePage() {
  return <Testfase showLogin />;
}
