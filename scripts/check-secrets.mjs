#!/usr/bin/env node
/**
 * Fails if the repository (or, with --bundle, the built client bundle) contains
 * secrets or confidential business data.
 *
 *   node scripts/check-secrets.mjs           scan every tracked + untracked, non-ignored file
 *   node scripts/check-secrets.mjs --bundle  scan .next/static (what browsers download)
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const SECRET_PATTERNS = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{8,}/],
  ["Supabase personal access token", /sbp_[A-Za-z0-9]{20,}/],
  ["JWT (e.g. legacy service_role / anon key)", /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["Database URL with password", /postgres(?:ql)?:\/\/[^:\s/@<]+:[^@\s<>]{3,}@/],
  ["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Anthropic/OpenAI style API key", /\b(?:sk-ant-|sk-)[A-Za-z0-9_-]{20,}/],
];
const BUNDLE_ONLY = [["Server-only env var name", /SUPABASE_SECRET_KEY|SERVICE_ROLE/i]];

// Files that must never be committed: business data and local env files.
const FORBIDDEN_FILES = [/\.xlsx?$/i, /\.xlsm$/i, /\.numbers$/i, /(^|\/)\.env(?!\.example$)(\..*)?$/, /(^|\/)private\//];

// Placeholder values documented in .env.example / tests are fine.
const ALLOWED = [/sb_publishable_build_placeholder/, /postgres:postgres@(?:127\.0\.0\.1|localhost)/];

const bundle = process.argv.includes("--bundle");
const root = path.resolve(import.meta.dirname, "..");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files;
if (bundle) {
  const dir = path.join(root, ".next/static");
  if (!existsSync(dir)) {
    console.error("No .next/static directory. Run `npm run build` first.");
    process.exit(2);
  }
  files = walk(dir).map((f) => path.relative(root, f));
} else {
  const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root });
  files = out.toString().split("\0").filter(Boolean).filter((f) => existsSync(path.join(root, f)));
}

const problems = [];
for (const file of files) {
  if (!bundle && FORBIDDEN_FILES.some((re) => re.test(file))) {
    problems.push(`${file}: file type must not be committed`);
    continue;
  }
  if (file === "package-lock.json" || file === "scripts/check-secrets.mjs") continue;
  let text;
  try {
    const buf = readFileSync(path.join(root, file));
    if (buf.includes(0)) continue; // binary
    text = buf.toString("utf8");
  } catch {
    continue;
  }
  for (const [label, re] of [...SECRET_PATTERNS, ...(bundle ? BUNDLE_ONLY : [])]) {
    for (const m of text.matchAll(new RegExp(re.source, "g"))) {
      const context = text.slice(m.index, m.index + m[0].length + 40);
      if (!ALLOWED.some((a) => a.test(context))) {
        problems.push(`${file}: ${label}`);
        break;
      }
    }
  }
}

if (problems.length) {
  console.error(`✖ ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ ${bundle ? "client bundle" : "repository"}: ${files.length} files scanned, no secrets or forbidden files`);
