import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { themeScript } from "@adsweet/ui";
import { LOCALE } from "@/i18n/request";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: "/icon/app-icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon/app-icon-16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/icon/app-icon-180.png",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EAE8E3" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <html lang={LOCALE} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <NextIntlClientProvider locale={LOCALE} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
