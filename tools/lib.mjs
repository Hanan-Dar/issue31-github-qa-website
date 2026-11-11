// Shared helpers for the checks in this folder.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SITE = join(ROOT, "sites", "main");
export const DIST = join(SITE, "dist");
export const CONTRACT = join(SITE, "url-contract.json");

/**
 * Listings that come and go with the posts: a tag's page and later pages of a list (/blog/page/2,
 * /blog/tag/tax/2), and a year's posts (/blog/year/2026, while an Archive widget links to them).
 * They're never in the contract, since a tag losing its last post would break the build; links to
 * them must still reach a built page.
 */
export const listing = (path) => /\/(tag\/[^/]+(\/\d+)?|page\/\d+|year\/\d{4})\/?$/.test(path);

/**
 * An address as the build's files name it: "/blog/tag/%E7%A8%8E%E9%87%91" → "/blog/tag/税金" (a tag
 * in any script is a folder of that name; links and the sitemap may write it encoded). One that
 * doesn't decode stays as it is.
 */
export function decodePath(path) {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

export const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

/** The site's origin, read from the built home page's canonical link (site.config.ts `origin`). */
export async function builtOrigin() {
  const html = await readFile(join(DIST, "index.html"), "utf8");
  const href = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (!href) throw new Error("dist/index.html has no canonical link: build the site first (pnpm build)");
  return new URL(href).origin;
}

/** Built HTML files → their addresses ("/", "/about"), without the 404 page. */
export async function builtPages() {
  const files = (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith(".html"));
  return files
    .map((f) => ({ file: f, path: `/${relative(".", f).replace(/\\/g, "/").replace(/\.html$/, "")}` }))
    .map((p) => (p.path === "/index" ? { ...p, path: "/" } : p))
    .filter((p) => p.path !== "/404");
}
