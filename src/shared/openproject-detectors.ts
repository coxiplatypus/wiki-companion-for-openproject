// Overview: DOM detector utilities that recognize OpenProject pages and locate wiki tree containers safely.
const OPENPROJECT_FINGERPRINT_SELECTORS = [
  "#main-menu",
  "[data-test-selector='op-sidebar']",
  "button[aria-label*='project menu' i]",
  "a[href*='/work_packages']",
  "a[href*='/wiki']"
] as const;

const WIKI_TOC_SELECTORS = [
  ".menu-wiki-pages-tree.tree-menu--container",
  ".menu-wiki-pages-tree",
  ".tree-menu--container[data-controller*='menus--subtree']",
  "ul.pages-hierarchy.-with-hierarchy",
  "ul.pages-hierarchy",
  "nav.wiki-page--toc",
  "nav.wiki-toc",
  "aside .wiki-toc",
  "#content .wiki .toc",
  "#content .toc"
] as const;

function queryFirst(selectors: readonly string[], root: ParentNode = document): HTMLElement | null {
  for (const selector of selectors) {
    const found = root.querySelector<HTMLElement>(selector);
    if (found) {
      return found;
    }
  }

  return null;
}

export function isPotentialOpenProjectDocument(root: ParentNode = document): boolean {
  const metaApplicationName = root.querySelector<HTMLMetaElement>("meta[name='application-name']")?.content;
  if (metaApplicationName && /openproject/i.test(metaApplicationName)) {
    return true;
  }

  for (const selector of OPENPROJECT_FINGERPRINT_SELECTORS) {
    if (root.querySelector(selector)) {
      return true;
    }
  }

  const title = typeof document !== "undefined" ? document.title : "";
  return /openproject/i.test(title);
}

export function findWikiTocRoot(root: ParentNode = document): HTMLElement | null {
  return queryFirst(WIKI_TOC_SELECTORS, root);
}
