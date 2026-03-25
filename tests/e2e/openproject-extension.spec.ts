// Overview: End-to-end test flow that validates extension behavior in a browser-like environment.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const fixture = (name: string): string =>
  readFileSync(resolve(process.cwd(), "tests/e2e/fixtures", name), "utf8");

test("fixture contains expected OpenProject wiki hooks", async ({ page }) => {
  await page.setContent(fixture("wiki-page.html"));

  await expect(page.locator(".menu-wiki-pages-tree")).toBeVisible();
  await expect(page.locator("a[href*='/wiki']")).toHaveCount(4);
});

test("fixture contains wiki toc structure for collapse tests", async ({ page }) => {
  await page.setContent(fixture("wiki-page.html"));

  await expect(page.locator(".menu-wiki-pages-tree li")).toHaveCount(4);
  await expect(page.locator("a[aria-current='page']")).toHaveCount(1);
});

test.skip("selector break path raises diagnostics without destructive mutations", async () => {
  // Requires extension runtime diagnostics capture in an integration browser session.
});
