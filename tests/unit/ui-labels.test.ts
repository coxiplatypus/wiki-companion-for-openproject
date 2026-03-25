/**
 * @vitest-environment jsdom
 * Overview: Checks that important UI labels and help text are present in HTML templates.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readHtml(relativePath: string): Document {
  const html = readFileSync(resolve(process.cwd(), relativePath), "utf8");
  return new DOMParser().parseFromString(html, "text/html");
}

describe("UI label clarity", () => {
  it("shows wiki-only controls in options", () => {
    const documentRef = readHtml("src/ui/options/index.html");
    const sidebarToggle = documentRef.querySelector("input[id*='sidebar']");
    const depthInput = documentRef.getElementById("wiki-depth-input");

    expect(sidebarToggle).toBeNull();
    expect(depthInput).not.toBeNull();

    const wikiToggle = documentRef.getElementById("wiki-toc-toggle");
    expect(wikiToggle).not.toBeNull();
    const depthLabel = depthInput?.closest("label")?.textContent ?? "";
    expect(depthLabel).toContain("Wiki tree keep-open depth");
  });

  it("shows wiki-only controls in popup", () => {
    const documentRef = readHtml("src/ui/popup/index.html");
    const sidebarToggle = documentRef.querySelector("input[id*='sidebar']");
    const depthInput = documentRef.getElementById("wiki-depth-input");

    expect(sidebarToggle).toBeNull();
    expect(depthInput).not.toBeNull();

    const wikiToggle = documentRef.getElementById("site-wiki-toggle");
    expect(wikiToggle).not.toBeNull();
    const depthLabel = depthInput?.closest("label")?.textContent ?? "";
    expect(depthLabel).toContain("Wiki tree keep-open depth");
  });
});
