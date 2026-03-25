// Overview: Options page controller that loads/saves allowlisted origins and global wiki settings.
import browser from "webextension-polyfill";
import type { RuntimeMessage, RuntimeResponse } from "../../shared/messages";
import {
  DEFAULT_WIKI_TOC_DEPTH,
  normalizeOrigin,
  originToMatchPattern,
  type ExtensionConfig
} from "../../shared/storage";

const addOriginForm = document.getElementById("add-origin-form") as HTMLFormElement;
const originInput = document.getElementById("origin-input") as HTMLInputElement;
const allowedOriginList = document.getElementById("allowed-origin-list") as HTMLUListElement;
const wikiTocToggle = document.getElementById("wiki-toc-toggle") as HTMLInputElement;
const diagnosticsToggle = document.getElementById("diagnostics-toggle") as HTMLInputElement;
const wikiDepthInput = document.getElementById("wiki-depth-input") as HTMLInputElement;
const status = document.getElementById("status") as HTMLParagraphElement;

let currentConfig: ExtensionConfig | null = null;

function setStatus(message: string): void {
  status.textContent = message;
}

function normalizeUserInputToOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return normalizeOrigin(withProtocol);
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

function renderOriginList(config: ExtensionConfig): void {
  allowedOriginList.innerHTML = "";

  if (config.allowedOrigins.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No origins configured yet.";
    allowedOriginList.append(empty);
    return;
  }

  for (const origin of config.allowedOrigins) {
    const item = document.createElement("li");
    item.className = "origin-item";

    const label = document.createElement("code");
    label.textContent = origin;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", async () => {
      const response = await sendMessage({ type: "remove-origin", origin });
      if (!response.ok || !response.config) {
        setStatus(response.ok ? "Failed to remove origin." : response.error);
        return;
      }

      currentConfig = response.config;
      render(response.config);
      setStatus(`Removed ${origin}`);
    });

    item.append(label, removeButton);
    allowedOriginList.append(item);
  }
}

function render(config: ExtensionConfig): void {
  renderOriginList(config);
  wikiTocToggle.checked = config.features.wikiTocAutoCollapse;
  diagnosticsToggle.checked = config.diagnostics.enabled;
  wikiDepthInput.value = String(config.wikiToc.depth);
}

async function saveConfig(): Promise<void> {
  if (!currentConfig) {
    return;
  }

  const response = await sendMessage({ type: "set-config", config: currentConfig });
  if (!response.ok || !response.config) {
    setStatus(response.ok ? "Could not save config." : response.error);
    return;
  }

  currentConfig = response.config;
  render(currentConfig);
  setStatus("Configuration saved.");
}

async function loadConfig(): Promise<void> {
  const response = await sendMessage({ type: "get-config" });
  if (!response.ok || !response.config) {
    setStatus(response.ok ? "Failed to load config." : response.error);
    return;
  }

  currentConfig = response.config;
  render(response.config);
}

addOriginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const origin = normalizeUserInputToOrigin(originInput.value);
  if (!origin) {
    setStatus("Enter a valid http(s) origin.");
    return;
  }

  const permissionResponse = await requestOriginPermission(origin);
  if (!permissionResponse.ok) {
    setStatus(permissionResponse.error);
    return;
  }

  const response = await sendMessage({ type: "persist-origin", origin });
  if (!response.ok || !response.config) {
    setStatus(response.ok ? "Could not add origin." : response.error);
    return;
  }

  currentConfig = response.config;
  render(currentConfig);
  originInput.value = "";
  setStatus(`Origin allowed and saved: ${origin}`);
});

wikiTocToggle.addEventListener("change", () => {
  if (!currentConfig) {
    return;
  }

  currentConfig.features.wikiTocAutoCollapse = wikiTocToggle.checked;
  void saveConfig();
});

diagnosticsToggle.addEventListener("change", () => {
  if (!currentConfig) {
    return;
  }

  currentConfig.diagnostics.enabled = diagnosticsToggle.checked;
  void saveConfig();
});

wikiDepthInput.addEventListener("change", () => {
  if (!currentConfig) {
    return;
  }

  const parsed = Number.parseInt(wikiDepthInput.value, 10);
  currentConfig.wikiToc.depth =
    Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_WIKI_TOC_DEPTH;
  void saveConfig();
});

void loadConfig();
