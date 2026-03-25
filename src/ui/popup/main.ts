// Overview: Popup controller that grants site access and toggles per-site wiki behavior.
import browser from "webextension-polyfill";
import type { RuntimeMessage, RuntimeResponse } from "../../shared/messages";
import {
  DEFAULT_WIKI_TOC_DEPTH,
  getEffectiveFeature,
  normalizeOrigin,
  originToMatchPattern,
  type ExtensionConfig
} from "../../shared/storage";

const originLabel = document.getElementById("origin-label") as HTMLParagraphElement;
const allowOriginButton = document.getElementById("allow-origin-button") as HTMLButtonElement;
const siteWikiToggle = document.getElementById("site-wiki-toggle") as HTMLInputElement;
const wikiDepthInput = document.getElementById("wiki-depth-input") as HTMLInputElement;
const openOptionsButton = document.getElementById("open-options-button") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;

let currentOrigin: string | null = null;
let currentConfig: ExtensionConfig | null = null;

function setStatus(message: string): void {
  status.textContent = message;
}

async function sendMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  return browser.runtime.sendMessage(message);
}

async function requestOriginPermission(origin: string): Promise<RuntimeResponse> {
  try {
    const pattern = originToMatchPattern(origin);
    const granted = await browser.permissions.request({ origins: [pattern] });
    if (!granted) {
      return { ok: false, error: "Permission request was denied." };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to request permission."
    };
  }
}

function updateTogglesState(): void {
  if (!currentConfig) {
    siteWikiToggle.disabled = true;
    wikiDepthInput.disabled = true;
    allowOriginButton.disabled = true;
    return;
  }

  wikiDepthInput.disabled = false;
  wikiDepthInput.value = String(currentConfig.wikiToc.depth);

  if (!currentOrigin) {
    siteWikiToggle.disabled = true;
    allowOriginButton.style.display = "block";
    allowOriginButton.disabled = true;
    return;
  }

  const isAllowed = currentConfig.allowedOrigins.includes(currentOrigin);
  allowOriginButton.style.display = isAllowed ? "none" : "block";
  allowOriginButton.disabled = false;

  siteWikiToggle.disabled = !isAllowed;
  siteWikiToggle.checked = getEffectiveFeature(currentConfig, currentOrigin, "wikiTocAutoCollapse");
}

async function refreshConfig(): Promise<void> {
  const response = await sendMessage({ type: "get-config" });
  if (!response.ok || !response.config) {
    setStatus(response.ok ? "Failed to load config." : response.error);
    return;
  }

  currentConfig = response.config;
  updateTogglesState();
}

async function saveGlobalConfig(statusMessage: string): Promise<boolean> {
  if (!currentConfig) {
    return false;
  }

  const response = await sendMessage({ type: "set-config", config: currentConfig });
  if (!response.ok || !response.config) {
    setStatus(response.ok ? "Could not update global setting." : response.error);
    return false;
  }

  currentConfig = response.config;
  updateTogglesState();
  setStatus(statusMessage);
  return true;
}

async function detectCurrentOrigin(): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url;

  if (!url) {
    originLabel.textContent = "No active tab URL available.";
    return;
  }

  const origin = normalizeOrigin(url);
  if (!origin) {
    originLabel.textContent = "This tab is not an http(s) page.";
    return;
  }

  currentOrigin = origin;
  originLabel.textContent = origin;
}

allowOriginButton.addEventListener("click", async () => {
  if (!currentOrigin) {
    setStatus("No valid origin selected.");
    return;
  }

  const permissionResponse = await requestOriginPermission(currentOrigin);
  if (!permissionResponse.ok) {
    setStatus(permissionResponse.error);
    return;
  }

  const response = await sendMessage({ type: "persist-origin", origin: currentOrigin });
  if (!response.ok || !response.config) {
    setStatus(response.ok ? "Could not allow origin." : response.error);
    return;
  }

  currentConfig = response.config;
  updateTogglesState();
  setStatus(`Origin allowed and saved: ${currentOrigin}`);
});

siteWikiToggle.addEventListener("change", async () => {
  if (!currentOrigin) {
    return;
  }

  const response = await sendMessage({
    type: "set-site-feature",
    origin: currentOrigin,
    feature: "wikiTocAutoCollapse",
    enabled: siteWikiToggle.checked
  });

  if (!response.ok || !response.config) {
    setStatus(response.ok ? "Could not update site setting." : response.error);
    return;
  }

  currentConfig = response.config;
  updateTogglesState();
  setStatus("Wiki TOC setting updated.");
});

wikiDepthInput.addEventListener("change", async () => {
  if (!currentConfig) {
    return;
  }

  const parsed = Number.parseInt(wikiDepthInput.value, 10);
  currentConfig.wikiToc.depth =
    Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_WIKI_TOC_DEPTH;
  await saveGlobalConfig("Wiki tree keep-open depth updated.");
});

openOptionsButton.addEventListener("click", async () => {
  await sendMessage({ type: "open-options" });
  window.close();
});

void (async () => {
  await detectCurrentOrigin();
  await refreshConfig();
})();
