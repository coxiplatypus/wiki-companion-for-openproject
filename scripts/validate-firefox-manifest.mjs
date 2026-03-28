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
  const dataCollectionPermissions = gecko.data_collection_permissions;
  if (!dataCollectionPermissions || typeof dataCollectionPermissions !== "object") {
    errors.push("Expected gecko.data_collection_permissions to be present.");
  } else {
    const required = dataCollectionPermissions.required;
    if (!Array.isArray(required) || !required.includes("none")) {
      errors.push('Expected gecko.data_collection_permissions.required to include "none".');
    }
  }

  if (gecko.strict_min_version !== "140.0") {
    errors.push(
      `Expected gecko.strict_min_version to be "140.0", got "${gecko.strict_min_version ?? "undefined"}".`
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
