// After the build: every <img> of the site's own pictures gets a srcset of the smaller copies Craeft
// made beside it when it was uploaded (foo.jpg, foo-400w.jpg, foo-800w.jpg…), so a phone or a small
// gallery picture downloads a small file. Done on the built pages rather than in each section, so
// pictures in text (Markdown) and in free sections get it too. A picture with no copies (one added
// before copies were made, or by hand) is left as it is.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const IMG = /<img\b[^>]*>/g;

async function* htmlFiles(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

/** A JPEG's, PNG's or WebP's width from its first bytes, or null. */
export function imageWidth(b: Uint8Array): number | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b.length >= 24) return ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0;
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    const chunk = ascii(12, 16);
    if (chunk === "VP8 " && b.length >= 30) return (b[26] | (b[27] << 8)) & 0x3fff;
    if (chunk === "VP8L" && b.length >= 25) return 1 + (b[21] | ((b[22] & 0x3f) << 8));
    if (chunk === "VP8X" && b.length >= 30) return 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    return null;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      // A frame header (SOF0–SOF15, not DHT, JPG or DAC): its width.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return (b[i + 7] << 8) | b[i + 8];
      i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    }
  }
  return null;
}

const attr = (tag: string, name: string): string | undefined => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/**
 * The srcset for a picture at `src` in the built site (`dist`), or null when it has no copies.
 * `files` is each folder's file names, read once.
 */
async function srcsetFor(dist: string, src: string, files: Map<string, Set<string>>): Promise<string | null> {
  // The site's own pictures only, with plain names (no query, no character to escape).
  const m = src.match(/^(\/(?:[\w.-]+\/)*)([\w.-]+?)\.(jpe?g|png|webp)$/i);
  if (!m) return null;
  const [, folder, base, ext] = m;
  let names = files.get(folder);
  if (!names) {
    names = new Set(await readdir(join(dist, folder)).catch(() => [] as string[]));
    files.set(folder, names);
  }
  const widths = [...names]
    .map((n) => n.match(new RegExp(`^${base.replace(/[.]/g, "\\.")}-(\\d+)w\\.${ext}$`))?.[1])
    .filter((w): w is string => !!w)
    .map(Number)
    .sort((a, b) => a - b);
  if (!widths.length) return null;
  const width = imageWidth(new Uint8Array(await readFile(join(dist, src)).catch(() => new Uint8Array())));
  if (!width) return null;
  return [...widths.filter((w) => w < width).map((w) => `${folder}${base}-${w}w.${ext} ${w}w`), `${src} ${width}w`].join(", ");
}

/** Adds srcset (and, where a section didn't say, sizes) to the built pages' pictures. */
export async function addSrcsets(dist: string, log: (msg: string) => void) {
  const files = new Map<string, Set<string>>();
  const sets = new Map<string, string | null>();
  let pictures = 0;
  for await (const file of htmlFiles(dist)) {
    const html = await readFile(file, "utf8");
    let out = "";
    let last = 0;
    for (const m of html.matchAll(IMG)) {
      const tag = m[0];
      const src = attr(tag, "src");
      if (!src || attr(tag, "srcset") !== undefined) continue;
      if (!sets.has(src)) sets.set(src, await srcsetFor(dist, src, files));
      const srcset = sets.get(src);
      if (!srcset) continue;
      // Without sizes the browser takes the picture to be as wide as the window. A lazy picture can
      // be measured first ("auto", Chrome); a section's own sizes are what other browsers use.
      const lazy = attr(tag, "loading") === "lazy";
      const given = attr(tag, "sizes");
      const sizes = lazy ? (given?.startsWith("auto") ? given : `auto, ${given ?? "100vw"}`) : given;
      const rest = tag.replace(/\ssizes="[^"]*"/, "").replace(/\s*\/?>$/, "");
      out += `${html.slice(last, m.index)}${rest} srcset="${srcset}"${sizes ? ` sizes="${sizes}"` : ""}>`;
      last = m.index + tag.length;
      pictures++;
    }
    if (last) await writeFile(file, out + html.slice(last));
  }
  log(`srcset: ${pictures} pictures with smaller copies`);
}
