/**
 * @vitest-environment jsdom
 * Overview: Exercises wiki auto-collapse behavior against DOM fixtures and simulated navigation cycles.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { initWikiTocAutoCollapse } from "../../src/content/wiki-toc-autocollapse";
import type { ScopedLogger } from "../../src/shared/logger";

const silentLogger: ScopedLogger = {
  info() {},
  warn() {},
  error() {}
};

function wikiTreeHtml(): string {
  return `
    <div class="menu-wiki-pages-tree tree-menu--container" data-controller="menus--subtree">
      <ul class="pages-hierarchy -with-hierarchy">
        <li class="-hierarchy-expanded" data-test-id="root">
          <span class="tree-menu--item" slug="overview">
            <a class="tree-menu--title" href="/projects/demo/wiki/overview">Overview</a>
          </span>
          <ul class="-with-hierarchy">
            <li class="-hierarchy-expanded" data-test-id="sub-a-parent">
              <span class="tree-menu--item" slug="sub-a">
                <a class="tree-menu--title" href="/projects/demo/wiki/overview/sub-a">Sub A</a>
              </span>
              <ul class="-with-hierarchy">
                <li class="-hierarchy-expanded"><span class="tree-menu--item" slug="sub-a-child"><a href="/projects/demo/wiki/overview/sub-a/child">A Child</a></span></li>
              </ul>
            </li>
            <li class="-hierarchy-expanded" data-test-id="sub-b-parent">
              <span class="tree-menu--item -selected" slug="sub-b">
                <a class="tree-menu--title" href="/projects/demo/wiki/overview/sub-b">Sub B</a>
              </span>
              <ul class="-with-hierarchy">
                <li class="-hierarchy-expanded"><span class="tree-menu--item" slug="sub-b-child"><a href="/projects/demo/wiki/overview/sub-b/child">B Child</a></span></li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  `;
}

function wikiTreeHtmlWithOuterWrappers(): string {
  return `
    <div class="menu-wiki-pages-tree tree-menu--container" data-controller="menus--subtree">
      <ul class="shell-level-a">
        <li data-test-id="wrapper-a">
          <ul class="shell-level-b">
            <li data-test-id="wrapper-b">
              <ul class="pages-hierarchy -with-hierarchy">
                <li class="-hierarchy-expanded" data-test-id="top-inactive">
                  <span class="tree-menu--item" slug="general-information">
                    <a class="tree-menu--title" href="/projects/demo/wiki/general-information">General Information</a>
                  </span>
                  <ul class="-with-hierarchy">
                    <li class="-hierarchy-expanded" data-test-id="top-inactive-child-parent">
                      <span class="tree-menu--item" slug="general-information/sub-a">
                        <a class="tree-menu--title" href="/projects/demo/wiki/general-information/sub-a">Sub A</a>
                      </span>
                      <ul class="-with-hierarchy">
                        <li class="-hierarchy-expanded">
                          <span class="tree-menu--item" slug="general-information/sub-a/deep">
                            <a class="tree-menu--title" href="/projects/demo/wiki/general-information/sub-a/deep">Deep Child</a>
                          </span>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li class="-hierarchy-expanded" data-test-id="top-active">
                  <span class="tree-menu--item -selected" slug="summer-semester-2026/sprints/sprint-8">
                    <a class="tree-menu--title" href="/projects/demo/wiki/summer-semester-2026/sprints/sprint-8">Sprint 8</a>
                  </span>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  `;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  history.replaceState({}, "", "/");
});

describe("initWikiTocAutoCollapse OpenProject tree behavior", () => {
  it("collapses non-active branches using OpenProject hierarchy classes", () => {
    history.replaceState({}, "", "/projects/demo/wiki/overview/sub-b");
    document.body.innerHTML = wikiTreeHtml();

    const controller = initWikiTocAutoCollapse({ depth: 1, logger: silentLogger });

    const inactiveParent = document.querySelector("[data-test-id='sub-a-parent']") as HTMLLIElement;
    const activeParent = document.querySelector("[data-test-id='sub-b-parent']") as HTMLLIElement;

    expect(inactiveParent.classList.contains("-hierarchy-collapsed")).toBe(true);
    expect(inactiveParent.classList.contains("-hierarchy-expanded")).toBe(false);

    expect(activeParent.classList.contains("-hierarchy-collapsed")).toBe(false);
    expect(activeParent.classList.contains("-hierarchy-expanded")).toBe(true);

    controller.dispose();
  });

  it("does not re-apply on unrelated DOM mutations after initial collapse", () => {
    history.replaceState({}, "", "/projects/demo/wiki/overview/sub-b");
    document.body.innerHTML = wikiTreeHtml();

    const controller = initWikiTocAutoCollapse({ depth: 1, logger: silentLogger });
    const inactiveParent = document.querySelector("[data-test-id='sub-a-parent']") as HTMLLIElement;

    inactiveParent.classList.remove("-hierarchy-collapsed");
    inactiveParent.classList.add("-hierarchy-expanded");
    document.body.append(document.createElement("div"));

    expect(inactiveParent.classList.contains("-hierarchy-expanded")).toBe(true);
    expect(inactiveParent.classList.contains("-hierarchy-collapsed")).toBe(false);

    controller.dispose();
  });

  it("applies collapse when wiki tree mounts within bootstrap timeout", () => {
    vi.useFakeTimers();
    history.replaceState({}, "", "/projects/demo/wiki/overview/sub-b");
    document.body.innerHTML = `<main data-test-id="placeholder"></main>`;

    const controller = initWikiTocAutoCollapse({ depth: 1, logger: silentLogger });

    vi.advanceTimersByTime(250);
    document.body.innerHTML = wikiTreeHtml();
    vi.advanceTimersByTime(150);

    const inactiveParent = document.querySelector("[data-test-id='sub-a-parent']") as HTMLLIElement;
    expect(inactiveParent.classList.contains("-hierarchy-collapsed")).toBe(true);

    controller.dispose();
  });

  it("reports diagnostics only after bounded timeout when wiki root is missing", () => {
    vi.useFakeTimers();
    history.replaceState({}, "", "/projects/demo/wiki/missing");
    document.body.innerHTML = `<main data-test-id="placeholder"></main>`;

    const controller = initWikiTocAutoCollapse({ depth: 1, logger: silentLogger });

    vi.advanceTimersByTime(4100);

    const diagnosticContainer = document.getElementById("opsc-diagnostic-container");
    expect(diagnosticContainer).not.toBeNull();
    expect(diagnosticContainer?.textContent).toContain("Wiki TOC selector changed");

    controller.dispose();
  });

  it("treats depth relative to wiki tree root, even with outer wrapper list items", () => {
    history.replaceState({}, "", "/projects/demo/wiki/summer-semester-2026/sprints/sprint-8");
    document.body.innerHTML = wikiTreeHtmlWithOuterWrappers();

    const controller = initWikiTocAutoCollapse({ depth: 2, logger: silentLogger });

    const topInactive = document.querySelector("[data-test-id='top-inactive']") as HTMLLIElement;
    const inactiveChildParent = document.querySelector(
      "[data-test-id='top-inactive-child-parent']"
    ) as HTMLLIElement;

    expect(topInactive.classList.contains("-hierarchy-collapsed")).toBe(false);
    expect(topInactive.classList.contains("-hierarchy-expanded")).toBe(true);
    expect(inactiveChildParent.classList.contains("-hierarchy-collapsed")).toBe(false);
    expect(inactiveChildParent.classList.contains("-hierarchy-expanded")).toBe(true);

    controller.dispose();
  });
});
