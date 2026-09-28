import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // `tmp/` is deliberately ignored local tooling output (including a nested
    // node_modules directory). It must never be treated as product tests or
    // make a clean release check fail.
    exclude: ["node_modules/**", ".next/**", "tmp/**"],
  },
});
