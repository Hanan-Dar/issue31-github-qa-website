// After the build: fills {INLINE_SCRIPT_HASHES} in dist/_headers with the sha256 of every inline
// <script> in the built HTML, so the Content-Security-Policy needs no 'unsafe-inline' and no
// hand-kept hash list. JSON-LD isn't executed, so it needs no hash.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;
const TOKEN = "{INLINE_SCRIPT_HASHES}";

async function* htmlFiles(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

export async function injectCspHashes(dist: string, log: (msg: string) => void) {
  const hashes = new Set<string>();
  for await (const file of htmlFiles(dist)) {
    for (const m of (await readFile(file, "utf8")).matchAll(INLINE_SCRIPT)) {
      if (m[1].trim()) hashes.add(`'sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}'`);
    }
  }
  const headersPath = join(dist, "_headers");
  const headers = await readFile(headersPath, "utf8");
  if (!headers.includes(TOKEN)) throw new Error(`${headersPath}: the CSP must contain ${TOKEN} in script-src`);
  await writeFile(headersPath, headers.replaceAll(TOKEN, [...hashes].join(" ")));
  log(`csp: ${hashes.size} inline script hashes`);
}
