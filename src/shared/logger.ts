// Overview: Small logging and in-page diagnostics helpers used when selector detection fails safely.
let diagnosticsEnabled = true;
const shownNotices = new Set<string>();
const NOTICE_CONTAINER_ID = "opsc-diagnostic-container";

export interface ScopedLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

export function setDiagnosticsEnabled(enabled: boolean): void {
  diagnosticsEnabled = enabled;
}

export function createLogger(scope: string): ScopedLogger {
  return {
    info(message, context) {
      if (!diagnosticsEnabled) {
        return;
      }

      console.info(`[Wiki Companion for OpenProject][${scope}] ${message}`, context ?? {});
    },
    warn(message, context) {
      if (!diagnosticsEnabled) {
        return;
      }

      console.warn(`[Wiki Companion for OpenProject][${scope}] ${message}`, context ?? {});
    },
    error(message, context) {
      if (!diagnosticsEnabled) {
        return;
      }

      console.error(`[Wiki Companion for OpenProject][${scope}] ${message}`, context ?? {});
    }
  };
}

function getOrCreateContainer(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  let container = document.getElementById(NOTICE_CONTAINER_ID);
  if (container) {
    return container;
  }

  container = document.createElement("div");
  container.id = NOTICE_CONTAINER_ID;
  container.setAttribute("role", "status");
  container.style.position = "fixed";
  container.style.bottom = "12px";
  container.style.right = "12px";
  container.style.zIndex = "2147483647";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "6px";
  document.body.append(container);

  return container;
}

function pushNotice(text: string): void {
  const container = getOrCreateContainer();
  if (!container) {
    return;
  }

  const notice = document.createElement("div");
  notice.textContent = text;
  notice.style.maxWidth = "360px";
  notice.style.padding = "8px 10px";
  notice.style.border = "1px solid #d1495b";
  notice.style.background = "#fff8f8";
  notice.style.color = "#58151c";
  notice.style.fontSize = "12px";
  notice.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  notice.style.borderRadius = "6px";
  notice.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";

  container.append(notice);
  window.setTimeout(() => {
    notice.remove();
    if (container.children.length === 0) {
      container.remove();
    }
  }, 7000);
}

export function reportDiagnostic(scope: string, code: string, message: string): void {
  if (!diagnosticsEnabled) {
    return;
  }

  const noticeKey = `${scope}:${code}`;
  if (shownNotices.has(noticeKey)) {
    return;
  }

  shownNotices.add(noticeKey);
  console.warn(`[Wiki Companion for OpenProject][${scope}] ${message}`);
  pushNotice(`Wiki Companion for OpenProject: ${message}`);
}
