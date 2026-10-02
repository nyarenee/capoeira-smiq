import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // tests/** holds integration/E2E suites that run against the real
    // staging environment (see vitest.integration.config.ts and
    // playwright.config.ts) — they must never be swallowed into the default
    // mocked unit-test run, even though *.int.test.ts still matches the
    // include glob above.
    exclude: ["node_modules/**", ".next/**", "tests/**"],
  },
});
