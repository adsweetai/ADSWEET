import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isDemo } from "@/lib/env";
import { DEMO_LOGINS } from "@/lib/demo-accounts";
import { currentUser } from "@/lib/server/auth";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginLink") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fout?: string }>;
}) {
  const sp = await searchParams;
  if (await currentUser())
    redirect(sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/vandaag");
  return <LoginForm next={sp.next} linkInvalid={sp.fout === "link"} demoEmails={isDemo ? DEMO_LOGINS : []} />;
}
