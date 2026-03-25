// Overview: Tests config defaults, migrations, and storage helpers without using a real browser profile.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { storageBucket, localSet, localRemove, browserMock } = vi.hoisted(() => {
  const bucket: Record<string, unknown> = {};

  const get = vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
    if (typeof keys === "string") {
      return { [keys]: bucket[keys] };
    }

    if (Array.isArray(keys)) {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = bucket[key];
      }
      return result;
    }

    if (keys && typeof keys === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, fallback] of Object.entries(keys)) {
        result[key] = key in bucket ? bucket[key] : fallback;
      }
      return result;
    }

    return { ...bucket };
  });

  const set = vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(bucket, items);
  });

  const remove = vi.fn(async (keys: string | string[]) => {
    if (Array.isArray(keys)) {
      for (const key of keys) {
        delete bucket[key];
      }
      return;
    }

    delete bucket[keys];
  });

  return {
    storageBucket: bucket,
    localSet: set,
    localRemove: remove,
    browserMock: {
      storage: {
        local: {
          get,
          set,
          remove
        }
      }
    }
  };
});

vi.mock("webextension-polyfill", () => ({
  default: browserMock
}));

import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  getConfig,
  getEffectiveFeature,
  normalizeOrigin,
  setConfig
} from "../../src/shared/storage";

beforeEach(() => {
  for (const key of Object.keys(storageBucket)) {
    delete storageBucket[key];
  }
  vi.clearAllMocks();
});

describe("storage", () => {
  it("returns defaults when storage is empty", async () => {
    const config = await getConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(localSet).toHaveBeenCalledWith({ [CONFIG_STORAGE_KEY]: DEFAULT_CONFIG });
  });

  it("uses depth 2 as fresh default but keeps existing saved depth during migration", async () => {
    expect(DEFAULT_CONFIG.wikiToc.depth).toBe(2);

    storageBucket[CONFIG_STORAGE_KEY] = {
      ...DEFAULT_CONFIG,
      wikiToc: {
        depth: 1,
        scope: "wiki_toc_only"
      }
    };

    const config = await getConfig();
    expect(config.wikiToc.depth).toBe(1);
  });

  it("migrates v1 sidebar fields to v2 wiki-only config and removes legacy sidebar state key", async () => {
    storageBucket[CONFIG_STORAGE_KEY] = {
      configVersion: 1,
      allowedOrigins: ["https://demo.openproject.local"],
      features: {
        sidebarStatePersistence: false,
        wikiTocAutoCollapse: false
      },
      wikiToc: {
        depth: 1,
        scope: "wiki_toc_only"
      },
      diagnostics: {
        enabled: true
      },
      siteOverrides: {
        "https://demo.openproject.local": {
          sidebarStatePersistence: true,
          wikiTocAutoCollapse: false
        }
      }
    };
    storageBucket.opSidebarCompanionSidebarStates = {
      "https://demo.openproject.local::project:alpha": true
    };

    const config = await getConfig();

    expect(config.configVersion).toBe(2);
    expect(config.features.wikiTocAutoCollapse).toBe(false);
    expect(config.siteOverrides["https://demo.openproject.local"]).toEqual({
      wikiTocAutoCollapse: false
    });
    expect(localRemove).toHaveBeenCalledWith("opSidebarCompanionSidebarStates");
    expect(storageBucket.opSidebarCompanionSidebarStates).toBeUndefined();
  });

  it("normalizes origins and applies wiki-only site feature overrides", async () => {
    await setConfig({
      ...DEFAULT_CONFIG,
      allowedOrigins: ["https://demo.openproject.local", "invalid-origin"],
      siteOverrides: {
        "https://demo.openproject.local": { wikiTocAutoCollapse: false }
      }
    });

    const config = await getConfig();
    expect(config.allowedOrigins).toEqual(["https://demo.openproject.local"]);
    expect(getEffectiveFeature(config, "https://demo.openproject.local", "wikiTocAutoCollapse")).toBe(
      false
    );
  });

  it("normalizes valid and invalid origin inputs", () => {
    expect(normalizeOrigin("https://example.com/path")).toBe("https://example.com");
    expect(normalizeOrigin("chrome://extensions")).toBeNull();
    expect(normalizeOrigin("not a url")).toBeNull();
  });
});
