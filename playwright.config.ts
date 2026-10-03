import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real backend (local database) and the production build of the frontend.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3016",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "npx tsx src/server.ts",
      cwd: "../smvs-108-backend",
      url: "http://localhost:5001/api/v1/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run start",
      url: "http://localhost:3016/login",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
