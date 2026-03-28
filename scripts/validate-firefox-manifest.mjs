// Overview: Validates Firefox manifest output to prevent AMO warning regressions.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const manifestPath = resolve(rootDir, "dist", "manifest.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const errors = [];

const background = manifest.background;
if (!background || !Array.isArray(background.scripts) || background.scripts.length === 0) {
  errors.push("Expected Firefox manifest to define background.scripts.");
}

if (background && Object.hasOwn(background, "service_worker")) {
  errors.push("Firefox manifest must not include background.service_worker.");
}

const gecko = manifest.browser_specific_settings?.gecko;
if (!gecko) {
  errors.push("Expected browser_specific_settings.gecko to be present.");
} else {
  if (Object.hasOwn(gecko, "data_collection_permissions")) {
    errors.push("Firefox manifest must not include gecko.data_collection_permissions.");
  }

  if (gecko.strict_min_version !== "128.0") {
    errors.push(
      `Expected gecko.strict_min_version to be "128.0", got "${gecko.strict_min_version ?? "undefined"}".`
    );
  }
}

if (errors.length > 0) {
  console.error("Firefox manifest validation failed:");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Firefox manifest validation passed.");
