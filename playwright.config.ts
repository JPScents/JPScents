import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  forbidOnly: true,
  reporter: "./tests/e2e/reporter.ts",
  outputDir: "output/e2e",
  use: {
    ...devices["Desktop Chrome"],
    actionTimeout: 8_000,
    navigationTimeout: 12_000,
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    env: { JP_E2E_LOCAL_ADMIN_KEY: "" },
  },
});
