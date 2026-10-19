import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4321",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // The installed Google Chrome, so no separate browser download is
      // needed (`bunx playwright install chromium` and dropping this line
      // works too).
      use: { browserName: "chromium", channel: "chrome" },
    },
  ],
  webServer: {
    command: "bun run preview",
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
