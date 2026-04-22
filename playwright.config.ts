import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:6001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "hub",
      testDir: "./tests/e2e/hub",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "backbone",
      testDir: "./tests/e2e/backbone",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
