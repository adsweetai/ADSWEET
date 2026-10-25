import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Servermodules importeren "server-only"; in tests draait alles op de server.
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
