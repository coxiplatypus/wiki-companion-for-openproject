// Overview: Background worker that handles settings, permissions, and messages from popup/options/content scripts.
import browser from "webextension-polyfill";
import type { RuntimeMessage, RuntimeResponse } from "../shared/messages";
import {
  type FeatureKey,
  getConfig,
  normalizeOrigin,
  originToMatchPattern,
  setConfig,
  updateConfig,
  type ExtensionConfig
} from "../shared/storage";

const CONTENT_SCRIPT_ID = "wiki-companion-for-openproject-content";
const CONTENT_SCRIPT_FILE = "content/bootstrap.js";

interface ScriptingApi {
  registerContentScripts: (scripts: Array<Record<string, unknown>>) => Promise<void>;
  unregisterContentScripts: (filter: { ids?: string[] }) => Promise<void>;
}

function getScriptingApi(): ScriptingApi | null {
  const maybeScripting = (browser as unknown as { scripting?: ScriptingApi }).scripting;
  return maybeScripting ?? null;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function pruneSiteOverrides(
  siteOverrides: ExtensionConfig["siteOverrides"],
  allowedOrigins: string[]
): ExtensionConfig["siteOverrides"] {
  const allowedSet = new Set(allowedOrigins);
  return Object.fromEntries(
    Object.entries(siteOverrides).filter(([origin]) => allowedSet.has(origin))
  );
}

async function getPermittedOrigins(origins: string[]): Promise<string[]> {
  const permitted: string[] = [];

  for (const origin of origins) {
    const pattern = originToMatchPattern(origin);
    const hasPermission = await browser.permissions.contains({ origins: [pattern] });
    if (hasPermission) {
      permitted.push(origin);
    }
  }

  return permitted;
}

async function syncDynamicContentScript(config?: ExtensionConfig): Promise<ExtensionConfig> {
  const scripting = getScriptingApi();
  let workingConfig = config ?? (await getConfig());

  const permittedOrigins = await getPermittedOrigins(workingConfig.allowedOrigins);
  if (permittedOrigins.length !== workingConfig.allowedOrigins.length) {
    workingConfig = await setConfig({
      ...workingConfig,
      allowedOrigins: permittedOrigins,
      siteOverrides: pruneSiteOverrides(workingConfig.siteOverrides, permittedOrigins)
    });
  }

  if (!scripting) {
    return workingConfig;
  }

  await scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] }).catch(() => undefined);

  if (workingConfig.allowedOrigins.length === 0) {
    return workingConfig;
  }

  const matches = workingConfig.allowedOrigins.map(originToMatchPattern);
  await scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: [CONTENT_SCRIPT_FILE],
      matches,
      runAt: "document_idle",
      allFrames: false,
      persistAcrossSessions: true
    }
  ]);

  return workingConfig;
}

async function broadcastConfigUpdated(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab: { id?: number }) => typeof tab.id === "number")
      .map((tab: { id?: number }) =>
        browser.tabs
          .sendMessage(tab.id as number, { type: "config-updated" })
          .catch(() => undefined)
      )
  );
}

async function initializeRuntime(): Promise<void> {
  const config = await getConfig();
  await syncDynamicContentScript(config);
}

async function handlePersistOrigin(origin: string): Promise<RuntimeResponse> {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return { ok: false, error: "Invalid origin. Expected an http(s) URL." };
  }

  const originPattern = originToMatchPattern(normalizedOrigin);
  const hasPermission = await browser.permissions.contains({ origins: [originPattern] });
  if (!hasPermission) {
    return {
      ok: false,
      error:
        "Permission for this origin is not granted. Use the popup/options allow action first."
    };
  }

  const config = await updateConfig((draft) => {
    draft.allowedOrigins = dedupe([...draft.allowedOrigins, normalizedOrigin]);
  });

  const synced = await syncDynamicContentScript(config);
  await broadcastConfigUpdated();
  return { ok: true, config: synced, origin: normalizedOrigin };
}

async function handleRemoveOrigin(origin: string): Promise<RuntimeResponse> {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return { ok: false, error: "Invalid origin." };
  }

  const originPattern = originToMatchPattern(normalizedOrigin);

  const config = await updateConfig((draft) => {
    draft.allowedOrigins = draft.allowedOrigins.filter((value) => value !== normalizedOrigin);
    delete draft.siteOverrides[normalizedOrigin];
  });

  await browser.permissions.remove({ origins: [originPattern] }).catch(() => undefined);

  const synced = await syncDynamicContentScript(config);
  await broadcastConfigUpdated();
  return { ok: true, config: synced, origin: normalizedOrigin };
}

async function handleSetConfig(config: ExtensionConfig): Promise<RuntimeResponse> {
  let nextConfig = await setConfig(config);
  const permittedOrigins = await getPermittedOrigins(nextConfig.allowedOrigins);

  if (permittedOrigins.length !== nextConfig.allowedOrigins.length) {
    nextConfig = await setConfig({
      ...nextConfig,
      allowedOrigins: permittedOrigins,
      siteOverrides: pruneSiteOverrides(nextConfig.siteOverrides, permittedOrigins)
    });
  }

  const synced = await syncDynamicContentScript(nextConfig);
  await broadcastConfigUpdated();
  return { ok: true, config: synced };
}

async function handleSetSiteFeature(
  origin: string,
  feature: FeatureKey,
  enabled: boolean
): Promise<RuntimeResponse> {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return { ok: false, error: "Invalid origin." };
  }

  const config = await updateConfig((draft) => {
    const override = draft.siteOverrides[normalizedOrigin] ?? {};
    override[feature] = enabled;
    draft.siteOverrides[normalizedOrigin] = override;
  });

  await broadcastConfigUpdated();
  return { ok: true, config };
}

async function handleMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  switch (message.type) {
    case "get-config": {
      const config = await getConfig();
      return { ok: true, config };
    }
    case "persist-origin":
      return handlePersistOrigin(message.origin);
    case "set-config":
      return handleSetConfig(message.config);
    case "add-origin":
      return handlePersistOrigin(message.origin);
    case "remove-origin":
      return handleRemoveOrigin(message.origin);
    case "set-site-feature":
      return handleSetSiteFeature(message.origin, message.feature, message.enabled);
    case "open-options":
      await browser.runtime.openOptionsPage();
      return { ok: true };
    default:
      return { ok: false, error: "Unsupported message type." };
  }
}

browser.runtime.onInstalled.addListener(() => {
  void initializeRuntime();
});

browser.runtime.onStartup.addListener(() => {
  void initializeRuntime();
});

browser.runtime.onMessage.addListener((message: unknown) =>
  handleMessage(message as RuntimeMessage)
);

void initializeRuntime();
