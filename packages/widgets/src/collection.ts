// Widgets whose items are typed in the section or kept once in one of the site's collections
// (plan/ux/widgets.md, "Collections and data"): Team (src/content/team/), FAQ (src/content/faq/),
// Logos (src/content/logos/), and Testimonials' own (testimonials.ts). The Source group they share,
// the choice of items, and what the editor says about it. Plain data in, data out, so the site's
// build, Craeft's render Worker and the editor's "Shows 4 of 6" agree.
import { type Def, type Group, meta, type Opt, type ZodApi } from "./options.ts";
import { countTags, hash, type Selection, type TagCount, tagsMatch, wantedTags } from "./posts.ts";

/** One item of a collection as the theme reads it (an Astro content entry has this shape). */
export interface Entry<T> {
  id: string;
  data: T & { tags?: string[]; position?: number };
}

export const ENTRIES_SHOW = ["items", "collection"] as const;
export const ENTRIES_ORDER = ["as-is", "name", "shuffled"] as const;
export type EntriesOrder = (typeof ENTRIES_ORDER)[number];

/** How a widget names its items and its collection, for its fields' words and the editor's sentences. */
export interface EntriesWords {
  /** One item ("team member", "question", "logo"). */
  noun: string;
  /** More than one ("team members", "questions", "logos"). */
  nouns: string;
  /** The typed choice's label ("These people"). */
  typed: string;
  /** The collection's choice's label ("The site's team"). */
  collection: string;
  /** The collection's folder (src/content/<folder>/). */
  folder: string;
  /** The tags field's format, whose suggestions are the collection's tags ("team-tags"). */
  tagFormat: string;
  /** Where typed items are added ("People"): said when none are. */
  typedField: string;
}

/** The order's words: "as-is" is each one's Position, then its file name. */
export const ORDER_LABELS = { "as-is": "In their set order", name: "A to Z", shuffled: "Shuffled" } as const;

/**
 * Where the items come from: typed in the section, or the site's collection (by tag, in an order,
 * how many). `max`: the most a section shows.
 */
export function entrySourceOptions(z: ZodApi, w: EntriesWords, { max = 24, group = "Source" as Group } = {}) {
  const m = meta("content", group);
  const shared = { show: "collection" };
  return {
    show: z
      .enum(ENTRIES_SHOW)
      .default("items")
      .meta(
        m({
          title: "Show",
          description: `${cap(w.nouns)} typed here, or the site's: kept once so other sections can show them too (Pages and posts lists them).`,
          labels: { items: w.typed, collection: w.collection },
        }),
      ) as Def<(typeof ENTRIES_SHOW)[number]>,
    tags: z
      .array(z.string())
      .optional()
      .meta(
        m({
          title: "Tags",
          description: `Only ${w.nouns} with these tags; left empty, all of them.`,
          showWhen: shared,
          format: w.tagFormat,
        }),
      ) as Opt<string[]>,
    tagMatch: z
      .enum(["any", "all"])
      .default("any")
      .meta(m({ title: "Tags to match", labels: { any: "Any of them", all: "All of them" }, more: true, showWhen: shared })) as Def<
      "any" | "all"
    >,
    order: z
      .enum(ENTRIES_ORDER)
      .default("as-is")
      .meta(
        m({
          title: "Order",
          description: "In their set order: by each one's Position, then its file name. Shuffled changes only when the site changes.",
          labels: ORDER_LABELS,
          showWhen: shared,
        }),
      ) as Def<EntriesOrder>,
    count: z
      .number()
      .int()
      .min(1)
      .max(max)
      .optional()
      .meta(m({ title: "How many", description: `Left empty, all of them (up to ${max}).`, showWhen: shared })) as Opt<number>,
  };
}

/** A section's Source settings as parsed (or as written: every one may be left out). */
export interface EntriesSettings {
  show?: (typeof ENTRIES_SHOW)[number];
  tags?: string[];
  tagMatch?: "any" | "all";
  order?: EntriesOrder;
  count?: number;
}

export interface EntriesSelection<T> extends Selection<T> {
  /** Why nothing shows, for the editor's dashed box. */
  reason?: string;
}

/** Entries in their set order: by Position (those without one last), then file name. */
export const bySetOrder = <T>(a: Entry<T>, b: Entry<T>) =>
  (a.data.position ?? Number.POSITIVE_INFINITY) - (b.data.position ?? Number.POSITIVE_INFINITY) || a.id.localeCompare(b.id);

/**
 * The items a section shows: the typed ones (all of them, as before widgets), or the collection's by
 * tag and order, up to `count` (else `max`). `nameOf` gives an item's name for "A to Z".
 */
export function selectEntries<T>(
  s: EntriesSettings,
  typed: readonly T[] | undefined,
  collection: readonly Entry<T>[],
  w: EntriesWords,
  { seed = "", max = 24, nameOf = () => "" }: { seed?: string; max?: number; nameOf?: (t: T) => string } = {},
): EntriesSelection<T> {
  if (s.show !== "collection") {
    const items = [...(typed ?? [])];
    return {
      items,
      matched: items.length,
      missing: [],
      ...(items.length ? {} : { reason: `No ${w.nouns} are typed yet: add some under ${w.typedField}.` }),
    };
  }
  let entries = [...collection].sort(bySetOrder);
  const all = entries.length;
  const want = wantedTags(s.tags);
  if (want) {
    const every = s.tagMatch === "all";
    entries = entries.filter((e) => tagsMatch(want, e.data.tags, every));
  }
  if (s.order === "name") entries.sort((a, b) => nameOf(a.data).localeCompare(nameOf(b.data)) || a.id.localeCompare(b.id));
  if (s.order === "shuffled") entries.sort((a, b) => hash(seed + a.id) - hash(seed + b.id) || a.id.localeCompare(b.id));
  const items = entries.slice(0, s.count ?? max).map((e) => e.data as T);
  const out: EntriesSelection<T> = { items, matched: entries.length, missing: [] };
  if (!items.length)
    out.reason = !all
      ? `The site has no ${w.nouns} yet (src/content/${w.folder}/).`
      : `No ${w.noun} is tagged ${quoted(s.tags ?? [], s.tagMatch === "all" ? "and" : "or")}: pick another tag.`;
  return out;
}

/** A collection's tags, with how many items have each. */
export const entryTags = (collection: readonly { data: { tags?: string[] } }[]): TagCount[] =>
  countTags(collection.map((e) => e.data.tags));

/** What such a section shows, in a sentence for the editor ("Shows all 4 team members tagged Home, in their set order."). */
export function summariseEntries(
  s: EntriesSettings,
  sel: EntriesSelection<unknown>,
  w: EntriesWords,
): { text: string; empty?: string; missing: string[] } {
  if (!sel.items.length) return { text: `Shows no ${w.nouns}.`, empty: sel.reason, missing: [] };
  const n = sel.items.length;
  if (s.show !== "collection") return { text: `Shows ${n === 1 ? `the ${w.noun}` : `all ${n} ${w.nouns}`} typed here.`, missing: [] };
  const tags = (s.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const which = tags.length ? ` tagged ${list(tags, s.tagMatch === "all" ? "and" : "or")}` : "";
  const order = { "as-is": "in their set order", name: "A to Z", shuffled: "shuffled" }[s.order ?? "as-is"];
  const count = n === sel.matched ? (n === 1 ? `the only ${w.noun}` : `all ${n} ${w.nouns}`) : `${n} of ${sel.matched} ${w.nouns}`;
  return { text: `Shows ${count}${which}, ${order}.`, missing: [] };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const list = (tags: readonly string[], and: string) =>
  tags.length < 2 ? (tags[0] ?? "") : `${tags.slice(0, -1).join(", ")} ${and} ${tags[tags.length - 1]}`;
const quoted = (tags: readonly string[], and: string) =>
  list(
    tags.map((t) => `"${t}"`),
    and,
  );
