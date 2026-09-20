import { defineConfig, devices } from "@playwright/test";
const deploymentURL = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  reporter: "list",
  use: {
    baseURL: deploymentURL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  ...(deploymentURL
    ? {}
    : {
        webServer: {
          command: "npm run preview -- --port 4173 --strictPort",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: !process.env.CI,
        },
      }),
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ?? "chromium",
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
