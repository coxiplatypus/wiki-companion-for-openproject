/**
 * @vitest-environment jsdom
 * Overview: Verifies Options UI depth input behavior and fallback handling.
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

const { sendMessageMock, browserMock, configStore } = vi.hoisted(() => {
  const configStore = {
    value: {
      configVersion: 2,
      allowedOrigins: [],
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

    return { ok: true, config: clone(configStore.value) };
  });

  return {
    sendMessageMock,
    configStore,
    browserMock: {
      runtime: {
        sendMessage: sendMessageMock
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

  configStore.value = {
    configVersion: 2,
    allowedOrigins: [],
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
    <form id="add-origin-form"></form>
    <input id="origin-input" />
    <ul id="allowed-origin-list"></ul>
    <input id="wiki-toc-toggle" type="checkbox" />
    <input id="diagnostics-toggle" type="checkbox" />
    <input id="wiki-depth-input" type="number" />
    <p id="status"></p>
  `;
});

describe("options depth fallback", () => {
  it("falls back to depth 2 when options depth input is invalid", async () => {
    await import("../../src/ui/options/main");
    await flushPromises();

    sendMessageMock.mockClear();

    const depthInput = document.getElementById("wiki-depth-input") as HTMLInputElement;
    depthInput.value = "";
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
