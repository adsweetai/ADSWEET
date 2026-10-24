import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@adsweet/ui", "@adsweet/playbook"],
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
