/**
 * @vitest-environment jsdom
 * Overview: Verifies popup depth controls and save behavior in a simulated browser DOM.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

type MockConfig = {
  configVersion: number;
  allowedOrigins: string[];
  features: {
    wikiTocAutoCollapse: boolean;
  };
  wikiToc: {
    depth: number;
    scope: "wiki_toc_only";
  };
  diagnostics: {
    enabled: boolean;
  };
  siteOverrides: Record<string, { wikiTocAutoCollapse?: boolean }>;
};

const { sendMessageMock, tabsQueryMock, browserMock, configStore } = vi.hoisted(() => {
  const configStore = {
    value: {
      configVersion: 2,
      allowedOrigins: ["https://demo.openproject.local"],
      features: {
        wikiTocAutoCollapse: true
      },
      wikiToc: {
        depth: 2,
        scope: "wiki_toc_only"
      },
      diagnostics: {
        enabled: true
      },
      siteOverrides: {}
    } as MockConfig
  };

  const clone = (value: unknown) => JSON.parse(JSON.stringify(value));

  const sendMessageMock = vi.fn(async (message: { type?: string; config?: MockConfig }) => {
    if (message.type === "get-config") {
      return { ok: true, config: clone(configStore.value) };
    }

    if (message.type === "set-config" && message.config) {
      configStore.value = clone(message.config);
      return { ok: true, config: clone(configStore.value) };
    }

    if (message.type === "open-options") {
      return { ok: true };
    }

    return { ok: true, config: clone(configStore.value) };
  });

  const tabsQueryMock = vi.fn(async () => [
    {
      url: "https://demo.openproject.local/projects/demo/wiki/overview"
    }
  ]);

  return {
    sendMessageMock,
    tabsQueryMock,
    configStore,
    browserMock: {
      runtime: {
        sendMessage: sendMessageMock
      },
      tabs: {
        query: tabsQueryMock
      },
      permissions: {
        request: vi.fn(async () => true)
      }
    }
  };
});

vi.mock("webextension-polyfill", () => ({
  default: browserMock
}));

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

beforeEach(() => {
  vi.resetModules();
  sendMessageMock.mockClear();
  tabsQueryMock.mockClear();

  configStore.value = {
    configVersion: 2,
    allowedOrigins: ["https://demo.openproject.local"],
    features: {
      wikiTocAutoCollapse: true
    },
    wikiToc: {
      depth: 2,
      scope: "wiki_toc_only"
    },
    diagnostics: {
      enabled: true
    },
    siteOverrides: {}
  };

  document.body.innerHTML = `
    <p id="origin-label"></p>
    <button id="allow-origin-button" type="button"></button>
    <input id="site-wiki-toggle" type="checkbox" />
    <input id="wiki-depth-input" type="number" />
    <button id="open-options-button" type="button"></button>
    <p id="status"></p>
  `;
});

describe("popup depth fallback", () => {
  it("falls back to depth 2 when popup depth input is invalid", async () => {
    await import("../../src/ui/popup/main");
    await flushPromises();
    await flushPromises();

    sendMessageMock.mockClear();

    const depthInput = document.getElementById("wiki-depth-input") as HTMLInputElement;
    depthInput.value = "0";
    depthInput.dispatchEvent(new Event("change", { bubbles: true }));

    await flushPromises();

    const setConfigCall = sendMessageMock.mock.calls.find(
      (call) => (call[0] as { type?: string }).type === "set-config"
    );

    expect(setConfigCall).toBeDefined();
    const message = setConfigCall?.[0] as { config: MockConfig };
    expect(message.config.wikiToc.depth).toBe(2);
  });
});
