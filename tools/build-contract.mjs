// Adds every built page that isn't in sites/main/url-contract.json yet as a 200 entry, so a new
// page is listed on purpose (review the change); listings that come and go (tag pages, page 2…) aren't. Existing entries keep their address and answer;
// only a page's `noindex` follows the build (a tag's page becomes indexable at its second post).
//   pnpm build && pnpm contract
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { builtPages, CONTRACT, DIST, listing, readJson } from "./lib.mjs";

const contract = await readJson(CONTRACT).catch(() => []);
const byPath = new Map(contract.map((e) => [e.path, e]));
const added = [];
const changed = [];
for (const { file, path } of await builtPages()) {
  if (listing(path)) continue;
  const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(await readFile(join(DIST, file), "utf8"));
  const entry = byPath.get(path);
  if (!entry) added.push({ path, expect: 200, kind: "page", why: "built page", ...(noindex ? { noindex: true } : {}) });
  else if (entry.expect === 200 && entry.kind === "page" && !!entry.noindex !== noindex) {
    if (noindex) entry.noindex = true;
    else delete entry.noindex;
    changed.push(`${path} (${noindex ? "noindex" : "indexable"})`);
  }
}
const files = await readdir(DIST);
for (const f of ["sitemap.xml", "robots.txt", "llms.txt", "rss.xml"]) {
  if (files.includes(f) && !byPath.has(`/${f}`)) added.push({ path: `/${f}`, expect: 200, kind: "file", why: "generated file" });
}
const out = [...contract, ...added].sort((a, b) => a.path.localeCompare(b.path));
await writeFile(CONTRACT, `${JSON.stringify(out, null, 2)}\n`);
console.log(added.length ? `added ${added.length}:\n  ${added.map((e) => e.path).join("\n  ")}` : "nothing to add");
if (changed.length) console.log(`changed ${changed.length}:\n  ${changed.join("\n  ")}`);
