// Overview: Defines extension config defaults, migrations, and browser.storage read/write helpers.
import browser from "webextension-polyfill";

export const CONFIG_STORAGE_KEY = "opSidebarCompanionConfig";
const LEGACY_SIDEBAR_STATES_STORAGE_KEY = "opSidebarCompanionSidebarStates";
export const CONFIG_VERSION = 2;
export const DEFAULT_WIKI_TOC_DEPTH = 2;

export type FeatureKey = "wikiTocAutoCollapse";
export type WikiTocScope = "wiki_toc_only";

export interface SiteFeatureOverrides {
  wikiTocAutoCollapse?: boolean;
}

export interface ExtensionConfig {
  configVersion: number;
  allowedOrigins: string[];
  features: {
    wikiTocAutoCollapse: boolean;
  };
  wikiToc: {
    depth: number;
    scope: WikiTocScope;
  };
  diagnostics: {
    enabled: boolean;
  };
  siteOverrides: Record<string, SiteFeatureOverrides>;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  configVersion: CONFIG_VERSION,
  allowedOrigins: [],
  features: {
    wikiTocAutoCollapse: true
  },
  wikiToc: {
    depth: DEFAULT_WIKI_TOC_DEPTH,
    scope: "wiki_toc_only"
  },
  diagnostics: {
    enabled: true
  },
  siteOverrides: {}
};

function cloneConfig(config: ExtensionConfig): ExtensionConfig {
  return JSON.parse(JSON.stringify(config)) as ExtensionConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function normalizeOrigin(input: string): string | null {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export function originToMatchPattern(origin: string): string {
  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    throw new Error(`Invalid origin: ${origin}`);
  }

  return `${normalized}/*`;
}

function sanitizeSiteOverrides(value: unknown): Record<string, SiteFeatureOverrides> {
  if (!isRecord(value)) {
    return {};
  }

  const overrides: Record<string, SiteFeatureOverrides> = {};
  for (const [origin, override] of Object.entries(value)) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin || !isRecord(override)) {
      continue;
    }

    const siteOverride: SiteFeatureOverrides = {};
    if (typeof override.wikiTocAutoCollapse === "boolean") {
      siteOverride.wikiTocAutoCollapse = override.wikiTocAutoCollapse;
    }

    if (Object.keys(siteOverride).length > 0) {
      overrides[normalizedOrigin] = siteOverride;
    }
  }

  return overrides;
}

export function migrateConfig(raw: unknown): ExtensionConfig {
  if (!isRecord(raw)) {
    return cloneConfig(DEFAULT_CONFIG);
  }

  const migrated = cloneConfig(DEFAULT_CONFIG);

  if (Array.isArray(raw.allowedOrigins)) {
    const normalizedOrigins = raw.allowedOrigins
      .map((origin) => (typeof origin === "string" ? normalizeOrigin(origin) : null))
      .filter((origin): origin is string => Boolean(origin));

    migrated.allowedOrigins = dedupe(normalizedOrigins);
  }

  if (isRecord(raw.features)) {
    if (typeof raw.features.wikiTocAutoCollapse === "boolean") {
      migrated.features.wikiTocAutoCollapse = raw.features.wikiTocAutoCollapse;
    }
  }

  if (isRecord(raw.wikiToc)) {
    if (typeof raw.wikiToc.depth === "number" && Number.isInteger(raw.wikiToc.depth)) {
      migrated.wikiToc.depth = Math.max(1, raw.wikiToc.depth);
    }

    if (raw.wikiToc.scope === "wiki_toc_only") {
      migrated.wikiToc.scope = raw.wikiToc.scope;
    }
  }

  if (isRecord(raw.diagnostics) && typeof raw.diagnostics.enabled === "boolean") {
    migrated.diagnostics.enabled = raw.diagnostics.enabled;
  }

  migrated.siteOverrides = sanitizeSiteOverrides(raw.siteOverrides);

  migrated.configVersion = CONFIG_VERSION;
  return migrated;
}

export async function getConfig(): Promise<ExtensionConfig> {
  const stored = await browser.storage.local.get([
    CONFIG_STORAGE_KEY,
    LEGACY_SIDEBAR_STATES_STORAGE_KEY
  ]);
  const migrated = migrateConfig(stored[CONFIG_STORAGE_KEY]);
  const hasLegacySidebarStates =
    Object.prototype.hasOwnProperty.call(stored, LEGACY_SIDEBAR_STATES_STORAGE_KEY) &&
    stored[LEGACY_SIDEBAR_STATES_STORAGE_KEY] !== undefined;

  const needsWriteback =
    !stored[CONFIG_STORAGE_KEY] ||
    JSON.stringify(stored[CONFIG_STORAGE_KEY]) !== JSON.stringify(migrated);

  if (needsWriteback) {
    await browser.storage.local.set({ [CONFIG_STORAGE_KEY]: migrated });
  }

  if (hasLegacySidebarStates) {
    await browser.storage.local.remove(LEGACY_SIDEBAR_STATES_STORAGE_KEY);
  }

  return migrated;
}

export async function setConfig(config: ExtensionConfig): Promise<ExtensionConfig> {
  const migrated = migrateConfig(config);
  await browser.storage.local.set({ [CONFIG_STORAGE_KEY]: migrated });
  return migrated;
}

export async function updateConfig(
  updater: (config: ExtensionConfig) => ExtensionConfig | void
): Promise<ExtensionConfig> {
  const current = await getConfig();
  const draft = cloneConfig(current);
  const updated = updater(draft) ?? draft;
  return setConfig(updated);
}

export function getEffectiveFeature(
  config: ExtensionConfig,
  origin: string,
  featureKey: FeatureKey
): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return config.features[featureKey];
  }

  const override = config.siteOverrides[normalizedOrigin];
  const overrideValue = override?.[featureKey];
  return typeof overrideValue === "boolean" ? overrideValue : config.features[featureKey];
}
