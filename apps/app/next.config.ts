import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@adsweet/ui", "@adsweet/playbook", "@adsweet/db", "@adsweet/mails"],
  // PGlite laadt zijn WebAssembly zelf; niet bundelen.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingRoot: repoRoot,
  // De demomodus leest het schema en de voorbeelddata van schijf.
  outputFileTracingIncludes: {
    "/**": ["../../supabase/migrations/*.sql", "../../packages/db/sql/*.sql", "../../packages/db/seed.sql", "../../pnpm-workspace.yaml"],
  },
};

export default withNextIntl(nextConfig);
