// Overview: Playwright E2E test runner settings (where tests live and how they execute).
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true
  }
});
