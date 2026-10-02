import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.STAGING_URL;
if (!baseURL) {
  throw new Error(
    "STAGING_URL is not set. Run via `npm run test:e2e` (loads .env.staging-test), or set it manually."
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
