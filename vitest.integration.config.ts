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
    include: ["tests/integration/**/*.int.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    testTimeout: 15000,
  },
});
