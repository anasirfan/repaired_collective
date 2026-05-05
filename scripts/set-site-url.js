/**
 * On Vercel, rewrites legacy Netlify-origin absolute URLs so canonical / OG /
 * schema / sitemap match the deployed host (production or preview).
 *
 * Priority: SITE_URL → VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL
 * (Ensure "System Environment Variables" is enabled in the Vercel project.)
 */

const fs = require("fs");
const path = require("path");

const LEGACY_ORIGIN = "https://mobrepair-demo-final.netlify.app";
const FILES = ["index.html", "aboutus.html", "review.html", "robots.txt", "sitemap.xml"];

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

const root = path.join(__dirname, "..");
const nextOrigin = originFromEnv();

if (!nextOrigin) {
  console.log(
    "[set-site-url] No SITE_URL, VERCEL_PROJECT_PRODUCTION_URL, or VERCEL_URL — leaving files unchanged."
  );
  process.exit(0);
}

let touched = 0;
for (const file of FILES) {
  const fp = path.join(root, file);
  if (!fs.existsSync(fp)) continue;
  let body = fs.readFileSync(fp, "utf8");
  if (!body.includes(LEGACY_ORIGIN)) continue;
  body = body.split(LEGACY_ORIGIN).join(nextOrigin);
  fs.writeFileSync(fp, body);
  touched += 1;
}

if (touched) {
  console.log(`[set-site-url] Updated ${touched} file(s) → ${nextOrigin}`);
} else {
  console.log("[set-site-url] No legacy Netlify URLs found; nothing to rewrite.");
}
