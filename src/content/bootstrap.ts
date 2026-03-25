// Overview: Entry point for content-script behavior; it loads config and starts wiki features on matching pages.
import browser from "webextension-polyfill";
import type { WikiTocController } from "./wiki-toc-autocollapse";
import { initWikiTocAutoCollapse } from "./wiki-toc-autocollapse";
import {
  getConfig,
  getEffectiveFeature,
  normalizeOrigin,
  CONFIG_STORAGE_KEY
} from "../shared/storage";
import { createLogger, setDiagnosticsEnabled, reportDiagnostic } from "../shared/logger";
import { isPotentialOpenProjectDocument } from "../shared/openproject-detectors";

type Controller = WikiTocController;

declare global {
  interface Window {
    __opWikiCompanionBootstrapped?: boolean;
  }
}

if (!window.__opWikiCompanionBootstrapped) {
  window.__opWikiCompanionBootstrapped = true;
  void bootstrap();
}

async function bootstrap(): Promise<void> {
  const logger = createLogger("bootstrap");
  const controllers: Controller[] = [];

  const stopControllers = (): void => {
    while (controllers.length > 0) {
      const controller = controllers.pop();
      controller?.dispose();
    }
  };

  const initializeFeatures = async (): Promise<void> => {
    const origin = normalizeOrigin(window.location.origin);
    if (!origin) {
      return;
    }

    const config = await getConfig();
    if (!config.allowedOrigins.includes(origin)) {
      stopControllers();
      return;
    }

    setDiagnosticsEnabled(config.diagnostics.enabled);

    if (!isPotentialOpenProjectDocument(document)) {
      logger.info("Page does not look like OpenProject, skipping feature boot.", {
        href: window.location.href
      });
      stopControllers();
      return;
    }

    stopControllers();

    const wikiEnabled = getEffectiveFeature(config, origin, "wikiTocAutoCollapse");
    if (wikiEnabled && config.wikiToc.scope === "wiki_toc_only") {
      const wikiController = initWikiTocAutoCollapse({
        depth: config.wikiToc.depth,
        logger: createLogger("wiki-toc")
      });
      controllers.push(wikiController);
    }
  };

  const scheduleRefresh = (() => {
    let refreshTimeout: number | null = null;
    return (): void => {
      if (refreshTimeout !== null) {
        window.clearTimeout(refreshTimeout);
      }

      refreshTimeout = window.setTimeout(() => {
        void initializeFeatures();
      }, 120);
    };
  })();

  const patchHistory = (): void => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      scheduleRefresh();
      return result;
    };

    history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      scheduleRefresh();
      return result;
    };

    window.addEventListener("popstate", scheduleRefresh);
    window.addEventListener("hashchange", scheduleRefresh);
    document.addEventListener("turbo:load", scheduleRefresh);
    document.addEventListener("turbo:render", scheduleRefresh);
    document.addEventListener("turbo:frame-load", scheduleRefresh);
  };

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[CONFIG_STORAGE_KEY]) {
      scheduleRefresh();
    }
  });

  browser.runtime.onMessage.addListener((message: unknown) => {
    if ((message as { type?: string })?.type === "config-updated") {
      scheduleRefresh();
    }
  });

  patchHistory();

  try {
    await initializeFeatures();
  } catch (error) {
    reportDiagnostic(
      "bootstrap",
      "initialize-error",
      "Feature initialization failed; extension paused on this page."
    );
    logger.error("Failed to initialize features", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
