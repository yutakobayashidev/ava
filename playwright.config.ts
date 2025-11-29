/** biome-ignore-all lint/style/noProcessEnv: playwrightの設定は許可 */

import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: Boolean(process.env.CI)
    ? [
        ["github"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
      ],
  use: {
    channel: "chromium",
    headless: true,
    screenshot: Boolean(process.env.CI) ? "off" : "only-on-failure",
    trace: Boolean(process.env.CI) ? "off" : "on-first-retry",
    video: Boolean(process.env.CI) ? "off" : "retain-on-failure",
    actionTimeout: 30000,
    navigationTimeout: 10000,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.\/e2e\/setup\/.*.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
      testIgnore: /.\/e2e\/setup\/.*.ts/,
    },
  ],
});
