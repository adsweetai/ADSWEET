import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@adsweet/ui", "@adsweet/playbook", "@adsweet/db"],
  // PGlite laadt zijn WebAssembly zelf; niet bundelen.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingRoot: repoRoot,
  // De demomodus leest het schema en de voorbeelddata van schijf; Teksten en Academy lezen de teksten van de app.
  outputFileTracingIncludes: {
    "/**": [
      "../../supabase/migrations/*.sql",
      "../../packages/db/sql/*.sql",
      "../../packages/db/seed.sql",
      "../../pnpm-workspace.yaml",
      "../../apps/app/messages/*.json",
    ],
  },
};

export default withNextIntl(nextConfig);
