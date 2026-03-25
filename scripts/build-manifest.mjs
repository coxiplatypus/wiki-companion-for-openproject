// Overview: Merges base + browser-specific manifest fragments into one final manifest.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const manifestsDir = resolve(rootDir, "manifests");
const distDir = resolve(rootDir, "dist");

const targetArg = process.argv.find((arg) => arg.startsWith("--target"));
const target = targetArg?.includes("=") ? targetArg.split("=")[1] : process.argv[process.argv.indexOf("--target") + 1];

if (!target || !["firefox", "chromium"].includes(target)) {
  throw new Error("Usage: node scripts/build-manifest.mjs --target <firefox|chromium>");
}

const baseManifest = JSON.parse(readFileSync(resolve(manifestsDir, "base.json"), "utf8"));
const targetManifest = JSON.parse(readFileSync(resolve(manifestsDir, `${target}.json`), "utf8"));

function merge(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return Array.from(new Set([...left, ...right]));
  }

  if (left && right && typeof left === "object" && typeof right === "object") {
    const result = { ...left };
    for (const [key, value] of Object.entries(right)) {
      result[key] = key in result ? merge(result[key], value) : value;
    }

    return result;
  }

  return right;
}

const mergedManifest = merge(baseManifest, targetManifest);
mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, "manifest.json"), `${JSON.stringify(mergedManifest, null, 2)}\n`, "utf8");

console.log(`Wrote dist/manifest.json for target: ${target}`);
