// Search-engine checks on the built site (sites/main/dist). Run after `pnpm build`:
//   node tools/verify-seo.mjs
// Fails on:
//   - an internal link to a redirect, a gone page, or an address that isn't in the URL contract
//   - a page without a <title>, a meta description, one <h1>, or a canonical equal to its own address
//   - noindex on a page in the sitemap, or an indexable page missing from it
//   - a sitemap listing anything but the contract's indexable 200 pages (and indexable tag pages)
//   - JSON-LD that doesn't parse, lacks the business, the WebSite or the page node, has an @id
//     that points nowhere, or misses a required field for its type
//   - an og:image or an <img> pointing at a file that isn't in the build
//   - robots.txt blocking a known AI crawler, or not pointing at the sitemap
// Warns (doesn't fail) on titles over 65 characters and descriptions outside 50–170.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { builtOrigin, builtPages, CONTRACT, decodePath, DIST, listing, readJson } from "./lib.mjs";

const origin = await builtOrigin();
const contract = await readJson(CONTRACT);
const errors = [];
const warnings = [];
const err = (p, m) => errors.push(`${p}: ${m}`);
const warn = (p, m) => warnings.push(`${p}: ${m}`);

const REQUIRED = {
  Organization: ["name", "url", "logo"],
  WebSite: ["name", "url", "publisher"],
  BlogPosting: ["headline", "datePublished", "dateModified", "author", "publisher", "image", "mainEntityOfPage"],
  BreadcrumbList: ["itemListElement"],
  ItemList: ["itemListElement"],
};
const inBuild = (p) => existsSync(join(DIST, decodeURIComponent(p)));

const contractByPath = new Map(contract.map((e) => [e.path, e]));
const indexable = new Set();
const pages = await builtPages();
const built = new Set(pages.map((p) => p.path));
for (const { file, path } of pages) {
  const $ = cheerio.load(await readFile(join(DIST, file), "utf8"));
  const title = $("head > title").text().trim();
  const desc = $('meta[name="description"]').attr("content") ?? "";
  const canonical = $('link[rel="canonical"]').attr("href");
  if (!/noindex/.test($('meta[name="robots"]').attr("content") ?? "")) indexable.add(path);

  if (!title) err(path, "missing <title>");
  else if (title.length > 65) warn(path, `title is ${title.length} characters`);
  if (!desc) err(path, "missing meta description");
  else if (desc.length < 50 || desc.length > 170) warn(path, `description is ${desc.length} characters`);
  if (canonical !== origin + path) err(path, `canonical ${canonical} ≠ ${origin + path}`);
  const h1s = $("h1").length;
  if (h1s !== 1) err(path, `${h1s} <h1> elements (a page needs exactly one)`);
  if (!$("html").attr("lang")) err(path, "<html> has no lang");

  const og = $('meta[property="og:image"]').attr("content");
  if (og?.startsWith(origin) && !inBuild(new URL(og).pathname)) err(path, `og:image not in the build: ${og}`);
  $("img[src]").each((_, img) => {
    const src = $(img).attr("src");
    if (src.startsWith("/") && !src.startsWith("//") && !inBuild(src.split("?")[0])) err(path, `image not in the build: ${src}`);
    if ($(img).attr("alt") === undefined) err(path, `image without alt text: ${src}`);
  });

  // Internal links must go straight to a live page: not to a redirect, a 410 or an unknown address.
  $("a[href]").each((_, a) => {
    let href = $(a).attr("href");
    if (href.startsWith(origin)) href = href.slice(origin.length) || "/";
    if (!href.startsWith("/") || href.startsWith("//")) return;
    const target = decodePath(href.split("#")[0].split("?")[0] || "/");
    if (/^\/(media|favicons|_astro)\//.test(target) || /\.(xml|txt)$/.test(target)) return;
    if (listing(target)) {
      if (!built.has(target.replace(/\/$/, "") || "/")) err(path, `link to a list page that isn't built: ${href}`);
      return;
    }
    const entry = contractByPath.get(target);
    if (!entry) err(path, `link to an address not in the contract: ${href}`);
    else if (entry.expect !== 200) err(path, `link goes through a ${entry.expect}: ${href}${entry.to ? ` → ${entry.to}` : ""}`);
  });

  const scripts = $('script[type="application/ld+json"]');
  if (scripts.length !== 1) err(path, `expected 1 JSON-LD script, found ${scripts.length}`);
  let doc;
  try {
    doc = JSON.parse(scripts.first().text());
  } catch (e) {
    err(path, `JSON-LD does not parse: ${e.message}`);
    continue;
  }
  const nodes = doc["@graph"] ?? [];
  const byId = new Map(nodes.filter((n) => n["@id"]).map((n) => [n["@id"], n]));
  if (!byId.has(`${origin}/#organization`)) err(path, "JSON-LD lacks the business (#organization)");
  if (!byId.has(`${origin}/#website`)) err(path, "JSON-LD lacks the WebSite");
  if (!byId.has(`${origin}${path}#webpage`)) err(path, "JSON-LD lacks the page node");
  for (const n of nodes) {
    for (const t of [n["@type"]].flat()) {
      for (const k of REQUIRED[t] ?? []) if (n[k] === undefined || (Array.isArray(n[k]) && !n[k].length)) err(path, `${t} is missing ${k}`);
    }
  }
  JSON.stringify(nodes).replace(/\{"@id":"([^"]+)"\}/g, (m, id) => {
    if (id.startsWith(origin) && !byId.has(id)) err(path, `@id reference that points nowhere: ${id}`);
    return m;
  });
  // FAQ answers given to search engines must be visible on the page.
  const text = $("body").text().replace(/\s+/g, " ");
  for (const n of nodes) {
    for (const q of [n["@type"]].flat().includes("FAQPage") ? (n.mainEntity ?? []) : []) {
      if (!text.includes(q.name.replace(/\s+/g, " ").trim())) err(path, `FAQ question not visible on the page: "${q.name.slice(0, 60)}"`);
    }
  }
}

// The sitemap: exactly the contract's indexable 200 pages.
const sitemap = cheerio.load(await readFile(join(DIST, "sitemap.xml"), "utf8"), { xmlMode: true });
const listed = new Set();
sitemap("url > loc").each((_, e) => {
  const u = new URL(sitemap(e).text());
  if (u.origin !== origin) err(u.href, "sitemap address on another origin");
  // As the build names it (a tag's page in any script is listed encoded: "/blog/tag/%E7%A8%8E%E9%87%91").
  const path = decodePath(u.pathname);
  if (listed.has(path)) err(path, "listed twice in the sitemap");
  listed.add(path);
});
const contract200 = new Set(contract.filter((e) => e.expect === 200 && e.kind === "page" && !e.noindex).map((e) => e.path));
for (const p of listed) {
  if (!indexable.has(p)) err(p, "in the sitemap but not an indexable built page");
  if (!contract200.has(p) && !listing(p)) err(p, "in the sitemap but not a 200 page in url-contract.json");
}
for (const p of indexable) if (!listed.has(p)) err(p, "indexable page missing from the sitemap");

// robots.txt: nothing blocks the AI crawlers, and it points at the sitemap.
const robots = await readFile(join(DIST, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) err("/robots.txt", "doesn't point at the sitemap");
for (const group of robots.split(/\n\s*\n/)) {
  if (/^Disallow:\s*\/\s*$/m.test(group)) err("/robots.txt", `blocks the whole site for: ${group.match(/^User-agent:.*$/gm)?.join(", ")}`);
}

if (warnings.length) console.log(`warnings (${warnings.length}):\n  ${warnings.join("\n  ")}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} SEO error(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ SEO checks passed for ${pages.length} pages and ${listed.size} sitemap addresses`);
