/**
 * @vitest-environment jsdom
 * Overview: Tests detector helpers against simulated OpenProject-like DOM layouts.
 */

import { describe, expect, it } from "vitest";
import {
  findWikiTocRoot,
  isPotentialOpenProjectDocument
} from "../../src/shared/openproject-detectors";

describe("openproject detectors", () => {
  it("recognizes non-openproject pages as unsupported", () => {
    document.body.innerHTML = `<main><p>No known selectors here.</p></main>`;
    expect(isPotentialOpenProjectDocument(document)).toBe(false);
  });

  it("recognizes OpenProject fingerprints", () => {
    document.body.innerHTML = `<a href="/projects/demo/wiki/overview">Wiki</a>`;
    expect(isPotentialOpenProjectDocument(document)).toBe(true);
  });

  it("detects the OpenProject wiki tree root", () => {
    document.body.innerHTML = `
      <div class="menu-wiki-pages-tree tree-menu--container" data-controller="menus--subtree">
        <ul class="pages-hierarchy -with-hierarchy"></ul>
      </div>
    `;

    const root = findWikiTocRoot(document);
    expect(root).not.toBeNull();
    expect(root?.classList.contains("menu-wiki-pages-tree")).toBe(true);
  });
});
