// Overview: Creates the distributable ZIP file from the built extension output.
import { mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const distDir = resolve(rootDir, "dist");
const artifactsDir = resolve(rootDir, "artifacts");

const targetArg = process.argv.find((arg) => arg.startsWith("--target"));
const target = targetArg?.includes("=") ? targetArg.split("=")[1] : process.argv[process.argv.indexOf("--target") + 1] ?? "firefox";

const manifest = JSON.parse(readFileSync(resolve(distDir, "manifest.json"), "utf8"));
const version = manifest.version ?? "0.0.0";
const outputPath = resolve(
  artifactsDir,
  `wiki-companion-for-openproject-${target}-v${version}.zip`
);

mkdirSync(artifactsDir, { recursive: true });

const zipResult = spawnSync("zip", ["-r", outputPath, "."], {
  cwd: distDir,
  stdio: "inherit"
});

if (zipResult.error) {
  throw zipResult.error;
}

if (zipResult.status !== 0) {
  throw new Error(`zip failed with code ${zipResult.status}`);
}

console.log(`Packaged extension: ${outputPath}`);
