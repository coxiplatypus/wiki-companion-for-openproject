// Overview: Shared runtime message types so background/content/popup/options communicate with one contract.
import type { ExtensionConfig, FeatureKey } from "./storage";

export type RuntimeMessage =
  | { type: "get-config" }
  | { type: "set-config"; config: ExtensionConfig }
  | { type: "persist-origin"; origin: string }
  // Backward-compatible alias for older UI builds.
  | { type: "add-origin"; origin: string }
  | { type: "remove-origin"; origin: string }
  | {
      type: "set-site-feature";
      origin: string;
      feature: FeatureKey;
      enabled: boolean;
    }
  | { type: "open-options" };

export type RuntimeResponse =
  | { ok: true; config?: ExtensionConfig; origin?: string }
  | { ok: false; error: string };
