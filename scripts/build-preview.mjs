#!/usr/bin/env node
/**
 * Builds a single self-contained HTML file of the interface demo (fictional data)
 * for hosting as a private preview page. React is loaded from cdnjs; everything
 * else (app code, decimal.js, zod, CSS) is inlined.
 *   node scripts/build-preview.mjs <out-dir>
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(process.argv[2] ?? path.join(root, "preview/dist"));
mkdirSync(out, { recursive: true });

const js = await build({
  entryPoints: [path.join(root, "preview/standalone.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  write: false,
  jsx: "automatic",
  tsconfig: path.join(root, "tsconfig.json"),
  alias: {
    "react/jsx-runtime": path.join(root, "preview/jsx-runtime-shim.cjs"),
    react: path.join(root, "preview/react-shim.cjs"),
    "react-dom/client": path.join(root, "preview/react-dom-shim.cjs"),
  },
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_ENABLE_DEMO": '"1"' },
  legalComments: "none",
});

const globals = readFileSync(path.join(root, "src/app/globals.css"), "utf8").replace(
  '@import "tailwindcss";',
  '@import "tailwindcss" source(none);\n@source "../src/demo";',
);
const cssIn = path.join(root, "preview/.preview.css");
writeFileSync(cssIn, globals);
const cssOut = path.join(out, "preview.css");
execFileSync(path.join(root, "node_modules/.bin/tailwindcss"), ["-i", cssIn, "-o", cssOut, "--minify"], { stdio: "inherit" });
const css = readFileSync(cssOut, "utf8");

const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<title>ChefOS Costing Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${css.replace(/"Archivo Variable", /g, "")}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${code}</script>
`;
writeFileSync(path.join(out, "chefos-preview.html"), html);
console.log(`preview: ${path.join(out, "chefos-preview.html")} (${(html.length / 1024).toFixed(0)} KB)`);
