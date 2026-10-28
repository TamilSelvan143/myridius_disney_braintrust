import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the Risk Assessment Workbench E2E suite.
 *
 * Target is parameterised via BASE_URL so the move from the Lovable preview to a
 * custom domain is a one-line/env change — no spec edits. Defaults to the current
 * preview URL.
 */
const BASE_URL = process.env.BASE_URL ?? "https://october6.lovable.app";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // This suite drives a LIVE remote site over the network, so transient load/
  // latency flake is expected; retries are the standard mitigation (a spec that
  // fails deterministically still fails after its retries). CI gets 2, local 1.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
