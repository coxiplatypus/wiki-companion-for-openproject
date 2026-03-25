// Overview: Implements wiki tree auto-collapse logic (keep active branch open, collapse others by configured depth).
import { findWikiTocRoot } from "../shared/openproject-detectors";
import type { ScopedLogger } from "../shared/logger";
import { reportDiagnostic } from "../shared/logger";

const WIKI_TOC_STYLE_ID = "opsc-wiki-toc-style";
const NODE_ID_ATTRIBUTE = "data-opsc-toc-id";
const COLLAPSED_ATTRIBUTE = "data-opsc-collapsed";
const OPENPROJECT_TREE_CONTAINER_SELECTOR = ".menu-wiki-pages-tree, .tree-menu--container";
const OPENPROJECT_TREE_LIST_SELECTOR = "ul.pages-hierarchy";
const BOOTSTRAP_MAX_WAIT_MS = 4000;
const BOOTSTRAP_RETRY_MS = 125;

export interface WikiTocController {
  refresh: () => void;
  dispose: () => void;
}

export interface WikiTocInitOptions {
  depth: number;
  logger: ScopedLogger;
}

export interface TocNodeSnapshot {
  id: string;
  parentId: string | null;
  depth: number;
  isActive: boolean;
  hasChildren: boolean;
}

interface TreeContext {
  confident: boolean;
  isOpenProjectTree: boolean;
  rootBoundary: HTMLElement | null;
  listItems: HTMLLIElement[];
}

type ApplyResult = "applied" | "retry" | "unsupported";

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function rootHasOpenProjectWikiTree(root: HTMLElement): boolean {
  return root.matches(OPENPROJECT_TREE_CONTAINER_SELECTOR) || Boolean(root.querySelector(OPENPROJECT_TREE_LIST_SELECTOR));
}

function resolveTreeContext(root: HTMLElement): TreeContext {
  const isOpenProjectTree = rootHasOpenProjectWikiTree(root);

  if (isOpenProjectTree) {
    const openProjectRootList = root.querySelector<HTMLElement>("ul.pages-hierarchy");
    if (!openProjectRootList) {
      return {
        confident: false,
        isOpenProjectTree,
        rootBoundary: null,
        listItems: []
      };
    }

    const listItems = Array.from(openProjectRootList.querySelectorAll<HTMLLIElement>("li"));
    return {
      confident: listItems.length > 0,
      isOpenProjectTree,
      rootBoundary: openProjectRootList,
      listItems
    };
  }

  const scopedRootList =
    root.querySelector<HTMLElement>(":scope > ul, :scope > ol") ??
    (root.matches("ul,ol") ? root : null);

  if (!scopedRootList) {
    return {
      confident: false,
      isOpenProjectTree,
      rootBoundary: null,
      listItems: []
    };
  }

  const listItems = Array.from(scopedRootList.querySelectorAll<HTMLLIElement>("li"));
  return {
    confident: listItems.length > 0,
    isOpenProjectTree,
    rootBoundary: scopedRootList,
    listItems
  };
}

function isActiveNode(element: HTMLLIElement, root: HTMLElement): boolean {
  if (element.querySelector(":scope > .tree-menu--item.-selected")) {
    return true;
  }

  const selectedSlug = root.getAttribute("data-menus--subtree-selected-value");
  if (selectedSlug && selectedSlug !== "") {
    const slugElement = element.querySelector<HTMLElement>(":scope > .tree-menu--item[slug]");
    if (slugElement?.getAttribute("slug") === selectedSlug) {
      return true;
    }
  }

  if (element.classList.contains("active") || element.classList.contains("-active")) {
    return true;
  }

  if (element.querySelector("a[aria-current='page']")) {
    return true;
  }

  const currentPath = normalizePathname(window.location.pathname);
  const links = Array.from(element.querySelectorAll<HTMLAnchorElement>("a[href]"));
  return links.some((link) => {
    try {
      const hrefPath = normalizePathname(new URL(link.href, window.location.origin).pathname);
      return hrefPath === currentPath;
    } catch {
      return false;
    }
  });
}

/**
 * Depth is relative to the detected wiki tree root.
 * depth=0 => top-level wiki branch, depth=1 => first nested level, etc.
 */
function getDepth(element: HTMLLIElement, rootBoundary: HTMLElement): number {
  let depth = 0;
  let cursor: Element | null = element.parentElement ? element.parentElement.closest("li") : null;
  while (cursor && rootBoundary.contains(cursor)) {
    depth += 1;
    cursor = cursor.parentElement?.closest("li") ?? null;
  }

  return depth;
}

function collectNodes(root: HTMLElement): {
  confident: boolean;
  isOpenProjectTree: boolean;
  listItems: HTMLLIElement[];
  snapshots: TocNodeSnapshot[];
  byId: Map<string, HTMLLIElement>;
} {
  const context = resolveTreeContext(root);
  if (!context.confident || !context.rootBoundary) {
    return {
      confident: false,
      isOpenProjectTree: context.isOpenProjectTree,
      listItems: [],
      snapshots: [],
      byId: new Map<string, HTMLLIElement>()
    };
  }

  const listItems = context.listItems;
  const rootBoundary = context.rootBoundary;
  const byId = new Map<string, HTMLLIElement>();
  const snapshots: TocNodeSnapshot[] = [];

  listItems.forEach((item, index) => {
    const existingId = item.getAttribute(NODE_ID_ATTRIBUTE);
    const id = existingId ?? `node-${index}`;
    item.setAttribute(NODE_ID_ATTRIBUTE, id);
    byId.set(id, item);

    const parentLi = item.parentElement?.closest("li");
    const parentId =
      parentLi && rootBoundary.contains(parentLi)
        ? (parentLi.getAttribute(NODE_ID_ATTRIBUTE) ?? null)
        : null;

    snapshots.push({
      id,
      parentId,
      depth: getDepth(item, rootBoundary),
      isActive: isActiveNode(item, root),
      hasChildren: Boolean(item.querySelector(":scope > ul > li"))
    });
  });

  return {
    confident: true,
    isOpenProjectTree: context.isOpenProjectTree,
    listItems,
    snapshots,
    byId
  };
}

export function computeAutoCollapsedNodeIds(
  nodes: TocNodeSnapshot[],
  maxExpandedDepth: number
): Set<string> {
  const safeMaxDepth = Math.max(1, maxExpandedDepth);

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const keepOpen = new Set<string>();

  for (const node of nodes) {
    if (!node.isActive) {
      continue;
    }

    let current: TocNodeSnapshot | undefined = node;
    while (current) {
      keepOpen.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }

  const collapsed = new Set<string>();
  for (const node of nodes) {
    if (!node.hasChildren) {
      continue;
    }

    if (keepOpen.has(node.id)) {
      continue;
    }

    if (node.depth >= safeMaxDepth) {
      collapsed.add(node.id);
    }
  }

  return collapsed;
}

function ensureStyle(documentRef: Document): void {
  if (documentRef.getElementById(WIKI_TOC_STYLE_ID)) {
    return;
  }

  const style = documentRef.createElement("style");
  style.id = WIKI_TOC_STYLE_ID;
  style.textContent = `
    li[${COLLAPSED_ATTRIBUTE}="true"] > ul {
      display: none !important;
    }
  `;

  documentRef.head.append(style);
}

function applyCollapsedState(
  listItems: HTMLLIElement[],
  isOpenProjectTree: boolean,
  collapsedIds: Set<string>
): void {
  for (const li of listItems) {
    const id = li.getAttribute(NODE_ID_ATTRIBUTE);
    if (!id || !li.querySelector(":scope > ul > li")) {
      continue;
    }

    if (collapsedIds.has(id)) {
      if (isOpenProjectTree) {
        li.classList.remove("-hierarchy-expanded");
        li.classList.add("-hierarchy-collapsed");
      } else {
        li.setAttribute(COLLAPSED_ATTRIBUTE, "true");
      }
      continue;
    }

    if (isOpenProjectTree) {
      li.classList.remove("-hierarchy-collapsed");
      li.classList.add("-hierarchy-expanded");
    }
    li.removeAttribute(COLLAPSED_ATTRIBUTE);
  }
}

export function initWikiTocAutoCollapse(options: WikiTocInitOptions): WikiTocController {
  let disposed = false;
  let activeCycle = 0;
  let retryTimeout: number | null = null;
  let cycleDeadline = 0;
  let bootstrapObserver: MutationObserver | null = null;

  const stopBootstrapWatch = (): void => {
    if (retryTimeout !== null) {
      window.clearTimeout(retryTimeout);
      retryTimeout = null;
    }

    bootstrapObserver?.disconnect();
    bootstrapObserver = null;
  };

  const applyOnce = (): ApplyResult => {
    const root = findWikiTocRoot(document);
    if (!root) {
      return "retry";
    }

    const { confident, isOpenProjectTree, listItems, snapshots } = collectNodes(root);
    if (!confident) {
      reportDiagnostic(
        "wiki-toc",
        "toc-structure-unsupported",
        "Wiki tree structure is not recognized; auto-collapse paused for this page."
      );
      return "unsupported";
    }

    if (!isOpenProjectTree) {
      ensureStyle(document);
    }

    const collapsedIds = computeAutoCollapsedNodeIds(snapshots, options.depth);
    applyCollapsedState(listItems, isOpenProjectTree, collapsedIds);

    return "applied";
  };

  const scheduleRetry = (cycleId: number): void => {
    if (retryTimeout !== null) {
      return;
    }

    retryTimeout = window.setTimeout(() => {
      retryTimeout = null;
      attemptApply(cycleId);
    }, BOOTSTRAP_RETRY_MS);
  };

  const ensureBootstrapObserver = (cycleId: number): void => {
    if (bootstrapObserver || !document.body) {
      return;
    }

    bootstrapObserver = new MutationObserver(() => {
      scheduleRetry(cycleId);
    });

    bootstrapObserver.observe(document.body, {
      subtree: true,
      childList: true
    });
  };

  const attemptApply = (cycleId: number): void => {
    if (disposed || cycleId !== activeCycle) {
      return;
    }

    const result = applyOnce();
    if (result === "applied") {
      options.logger.info("Applied wiki TOC auto-collapse for navigation cycle.", {
        cycleId
      });
      stopBootstrapWatch();
      return;
    }

    if (result === "unsupported") {
      stopBootstrapWatch();
      return;
    }

    const isWikiPath = /\/wiki\//.test(window.location.pathname);
    if (!isWikiPath) {
      stopBootstrapWatch();
      return;
    }

    if (Date.now() >= cycleDeadline) {
      stopBootstrapWatch();
      reportDiagnostic(
        "wiki-toc",
        "toc-not-found",
        "Wiki TOC selector changed; auto-collapse paused for this page."
      );
      return;
    }

    ensureBootstrapObserver(cycleId);
    scheduleRetry(cycleId);
  };

  const startNavigationCycle = (): void => {
    activeCycle += 1;
    cycleDeadline = Date.now() + BOOTSTRAP_MAX_WAIT_MS;

    stopBootstrapWatch();
    attemptApply(activeCycle);
  };

  startNavigationCycle();

  return {
    refresh: startNavigationCycle,
    dispose() {
      disposed = true;
      stopBootstrapWatch();
    }
  };
}
