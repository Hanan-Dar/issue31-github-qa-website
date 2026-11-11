// "Use on other pages too" (plan/ux/widgets.md, "Collections and data"): a section's typed items
// (reviews, people, questions, logos, a gallery's pictures) moved into the site's matching collection,
// one file each (an album, for pictures), tagged with a name (the page's, or one typed), and the
// section switched to show the collection by that tag. The section looks as before; other sections
// can then show the same items, and a change to one changes it everywhere. The caller saves the
// section and the new files together, as one change.
import { tagSlug } from "./posts.ts";

/** A new file for the collection: src/content/<collection>/<id>.yaml holding `data`. */
export interface SharedFile {
  collection: string;
  id: string;
  data: Record<string, unknown>;
}

interface Kind {
  /** The typed list's field. */
  field: string;
  /** The value of `show` that means "typed here". */
  typed: string;
  collection: string;
  /** "review", "reviews". */
  noun: string;
  nouns: string;
  /** An item's name, for its file's name. */
  nameOf(item: Record<string, unknown>): string;
  /** An item as the collection keeps it. */
  entry(item: Record<string, unknown>): Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const drop = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));

const KINDS: Record<string, Kind> = {
  testimonials: {
    field: "items",
    typed: "items",
    collection: "testimonials",
    noun: "review",
    nouns: "reviews",
    nameOf: (r) => str(r.name),
    // A typed review's line under the name ("Boiler replacement, Headingley") is a testimonial's role.
    entry: (r) => drop({ quote: r.quote, name: r.name, role: r.detail, rating: r.rating }),
  },
  team: {
    field: "people",
    typed: "items",
    collection: "team",
    noun: "person",
    nouns: "people",
    nameOf: (p) => str(p.name),
    entry: (p) => drop({ ...p }),
  },
  faq: {
    field: "items",
    typed: "items",
    collection: "faq",
    noun: "question",
    nouns: "questions",
    nameOf: (q) => str(q.question),
    entry: (q) => drop({ question: q.question, answer: q.answer }),
  },
  logos: {
    field: "items",
    typed: "items",
    collection: "logos",
    noun: "logo",
    nouns: "logos",
    nameOf: (g) => str(g.name) || str(g.alt),
    entry: (g) => drop({ name: str(g.name) || str(g.alt), src: g.src, alt: g.alt, link: g.link }),
  },
  gallery: {
    field: "pictures",
    typed: "pictures",
    collection: "albums",
    noun: "picture",
    nouns: "pictures",
    nameOf: () => "",
    entry: (p) => drop({ ...p }),
  },
};

/** A section type's kind: own keys only (a blockType "constructor" is no kind). */
const kindOf = (blockType: unknown): Kind | undefined => {
  const t = str(blockType);
  return Object.hasOwn(KINDS, t) ? KINDS[t] : undefined;
};

/** What a section's typed items would move into, if it has any to move (else null). */
export function shareable(
  block: Record<string, unknown>,
): { collection: string; field: string; count: number; noun: string; nouns: string } | null {
  const k = kindOf(block.blockType);
  if (!k) return null;
  const items = block[k.field];
  if ((block.show ?? k.typed) !== k.typed || !Array.isArray(items) || !items.length) return null;
  return { collection: k.collection, field: k.field, count: items.length, noun: k.noun, nouns: k.nouns };
}

/** A file name from words: "Jo Bloggs" → "jo-bloggs" (at most 48 characters; `fallback` when none). */
export function fileId(words: string, fallback: string): string {
  // By characters, not UTF-16 units: a letter outside the BMP is never cut in two.
  const s = Array.from(tagSlug(words)).slice(0, 48).join("").replace(/-+$/, "");
  return s || fallback;
}

/** `id`, or `id-2`, `id-3`… : the first not in `taken` (which it's then added to). */
function unique(id: string, taken: Set<string>): string {
  let out = id;
  for (let n = 2; taken.has(out); n++) out = `${id}-${n}`;
  taken.add(out);
  return out;
}

export interface ShareResult {
  /** The section, now showing the collection by the tag (or the new album). */
  block: Record<string, unknown>;
  files: SharedFile[];
  /** What happened, for the person: "These 4 reviews are now kept once: …". */
  message: string;
  /** What else they should know (stars, items already tagged so). */
  notes: string[];
}

/**
 * Moves a section's typed items into its collection. `name`: the tag (or the album's name);
 * `existing`: the collection's items now (their ids and tags), so items already tagged so are
 * pointed out; `taken`: the file names already in the collection's folder (all of them, not only
 * the items read), so new files never collide; `maxFiles`: the most files one save holds (the
 * page's own file is one of them), past which it's refused before anything is saved.
 */
export function shareItems(
  block: Record<string, unknown>,
  {
    name,
    existing = [],
    taken: names = [],
    maxFiles = Number.POSITIVE_INFINITY,
  }: { name: string; existing?: readonly { id: string; tags?: readonly string[] }[]; taken?: readonly string[]; maxFiles?: number },
): ShareResult {
  const k = kindOf(block.blockType);
  const what = shareable(block);
  const tag = name.trim();
  if (!k || !what) throw new Error("This section has no typed items to move.");
  if (!tag) throw new Error("Give them a name.");
  const items = (block[k.field] as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  const taken = new Set([...existing.map((e) => e.id), ...names]);
  const out: Record<string, unknown> = { ...block };
  delete out[k.field];
  const n = items.length;
  const these = `${n === 1 ? "This" : `These ${n}`} ${n === 1 ? k.noun : k.nouns}`;

  if (k.collection === "albums") {
    const id = unique(fileId(tag, "album"), taken);
    Object.assign(out, { show: "album", album: id });
    return {
      block: out,
      files: [{ collection: "albums", id, data: { name: tag, pictures: items.map((p) => k.entry(p)) } }],
      message: `${these} ${n === 1 ? "is" : "are"} now the album "${tag}": other galleries can show it, and a change to it shows everywhere.`,
      notes: [],
    };
  }

  // A tag without a letter or a number selects nothing: the section would show none of them.
  if (!tagSlug(tag)) throw new Error("Give them a name with a letter or a number in it.");
  // One file each, and the page's: one save (one Undo) holds only so many.
  if (n + 1 > maxFiles)
    throw new Error(
      `Up to ${maxFiles - 1} at a time: this section has ${n} ${k.nouns}. Split them over two sections first (duplicate this one, then remove some from each), and use this on each with the same name.`,
    );
  const files = items.map((item, i) => ({
    collection: k.collection,
    id: unique(fileId(k.nameOf(item), `${k.noun}-${i + 1}`), taken),
    data: { ...k.entry(item), tags: [tag], position: i + 1 },
  }));
  Object.assign(out, { show: "collection", tags: [tag], tagMatch: "any", order: "as-is" });
  delete out.count;
  const notes: string[] = [];
  const slug = tagSlug(tag);
  const already = existing.filter((e) => (e.tags ?? []).some((t) => tagSlug(t) === slug)).length;
  if (already)
    notes.push(
      `${already === 1 ? `1 more ${k.noun} was` : `${already} more ${k.nouns} were`} already tagged "${tag}", so ${already === 1 ? "it shows" : "they show"} here too.`,
    );
  if (block.blockType === "testimonials") {
    const rated = items.filter((r) => typeof r.rating === "number").length;
    if (rated && rated < n && block.stars !== false)
      notes.push("Stars now show only when every review shown has a rating: give the others one in Pages and posts to show them.");
  }
  return {
    block: out,
    files,
    message: `${these} ${n === 1 ? "is" : "are"} now kept once: other sections can show ${n === 1 && k.noun !== "person" ? "it" : "them"} by the tag "${tag}".`,
    notes,
  };
}
