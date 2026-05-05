/**
 * Vercel expects a `public/` output when buildCommand is used.
 * Copies deployable files from the repo root into `public/`, optionally
 * rewriting legacy absolute URLs from env (same rules as before).
 *
 * Priority: SITE_URL → VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL
 */

const fs = require("fs");
const path = require("path");

const LEGACY_ORIGIN = "https://mobrepair-demo-final.netlify.app";
const SKIP_DIRS = new Set(["node_modules", "scripts", "public", ".git", ".vercel"]);
const SKIP_FILES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "vercel.json",
  ".gitignore",
]);

function originFromEnv() {
  const normalized = (s) =>
    String(s || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");

  const explicit = normalized(process.env.SITE_URL);
  if (explicit) return `https://${explicit}`;

  const prod = normalized(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (prod) return `https://${prod}`;

  const vercel = normalized(process.env.VERCEL_URL);
  if (vercel) return `https://${vercel}`;

  return "";
}

function rewriteText(body, nextOrigin) {
  if (!nextOrigin || !body.includes(LEGACY_ORIGIN)) return body;
  return body.split(LEGACY_ORIGIN).join(nextOrigin);
}

function shouldRewriteByName(name) {
  return /\.(html|txt|xml)$/i.test(name);
}

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const nextOrigin = originFromEnv();

if (!nextOrigin) {
  console.warn(
    "[build-public] No SITE_URL, VERCEL_PROJECT_PRODUCTION_URL, or VERCEL_URL — copying without URL rewrite."
  );
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

let count = 0;
for (const name of fs.readdirSync(root)) {
  if (SKIP_FILES.has(name)) continue;
  const src = path.join(root, name);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (SKIP_DIRS.has(name)) continue;
    continue;
  }

  const dest = path.join(publicDir, name);

  if (shouldRewriteByName(name)) {
    let body = fs.readFileSync(src, "utf8");
    body = rewriteText(body, nextOrigin);
    fs.writeFileSync(dest, body);
  } else {
    fs.copyFileSync(src, dest);
  }
  count++;
}

if (nextOrigin && count) {
  console.log(`[build-public] Wrote ${count} file(s) to public/ → ${nextOrigin}`);
} else {
  console.log(`[build-public] Wrote ${count} file(s) to public/`);
}
