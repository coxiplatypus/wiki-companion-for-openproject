// Overview: Bundles extension TypeScript and copies static UI files into the build output folder.
import { mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const distDir = resolve(rootDir, "dist");

const entryPoints = {
  "background/service-worker": resolve(rootDir, "src/background/service-worker.ts"),
  "content/bootstrap": resolve(rootDir, "src/content/bootstrap.ts"),
  "ui/options/main": resolve(rootDir, "src/ui/options/main.ts"),
  "ui/popup/main": resolve(rootDir, "src/ui/popup/main.ts")
};

mkdirSync(distDir, { recursive: true });

await build({
  entryPoints,
  outdir: distDir,
  bundle: true,
  format: "esm",
  target: ["firefox128"],
  sourcemap: true,
  legalComments: "none",
  logLevel: "info"
});

mkdirSync(resolve(distDir, "ui/options"), { recursive: true });
mkdirSync(resolve(distDir, "ui/popup"), { recursive: true });

copyFileSync(resolve(rootDir, "src/ui/options/index.html"), resolve(distDir, "ui/options/index.html"));
copyFileSync(resolve(rootDir, "src/ui/options/styles.css"), resolve(distDir, "ui/options/styles.css"));
copyFileSync(resolve(rootDir, "src/ui/popup/index.html"), resolve(distDir, "ui/popup/index.html"));
copyFileSync(resolve(rootDir, "src/ui/popup/styles.css"), resolve(distDir, "ui/popup/styles.css"));

console.log("Built extension assets in dist/");
