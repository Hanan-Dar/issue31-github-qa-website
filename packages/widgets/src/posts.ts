// The Posts widget's choice of posts (plan/ux/widgets.md, "Source"): which of the site's posts a
// section shows, and in what order. Plain data in, data out, so the site's build, Craeft's render
// Worker and the editor's "Shows 3 of 14" all agree. The theme draws what this returns.
import {
  type CarouselShape,
  type Def,
  carouselOptions,
  type ItemShape,
  itemOptions,
  LOAD_MORE_CAP,
  type Layout,
  type LayoutShape,
  layoutOptions,
  meta,
  type MoreShape,
  moreOptions,
  type SourceShape,
  sourceOptions,
  type ZodApi,
} from "./options.ts";

/** A post as the theme reads it (an Astro content entry has this shape). */
export interface PostEntry {
  id: string;
  data: { title: string; date: Date; updated?: Date; tags?: string[]; featured?: boolean };
}

/** What a Posts section asks for. Every setting is optional: left out, it shows the newest. */
export interface PostsSource {
  /** Newest posts, the ones picked by hand (in `pick`'s order), or those with `tags`. */
  show?: "newest" | "picked" | "tagged";
  /** Post ids, in the order they're shown (`show: "picked"`). */
  pick?: string[];
  tags?: string[];
  /** A post needs any of `tags`, or all of them. */
  tagMatch?: "any" | "all";
  /** Posts with any of these tags are left out. */
  excludeTags?: string[];
  /** These posts are left out. */
  exclude?: string[];
  /** Posts marked Featured come first (WordPress's "sticky"). */
  featuredFirst?: boolean;
  order?: "newest" | "oldest" | "title" | "updated" | "shuffled";
  /** How many are shown; the theme's own default when left out. */
  count?: number;
  /** Leaves out the first ones that match (Elementor's "offset"). */
  skip?: number;
  /** Leaves out posts already shown above it on the page (Elementor's "avoid duplicates"). */
  unique?: boolean;
  /** On a post's page (a widget area beside it), leaves that post out. */
  notCurrent?: boolean;
}

/** Where on the page the section is: what's shown above it, and what the shuffle starts from. */
export interface PageContext {
  /** Post ids shown by sections above this one. */
  shown?: ReadonlySet<string>;
  /** The same seed gives the same shuffle: the site's commit, so the editor and the built site agree. */
  seed?: string;
  /** The post whose page this is (a widget area beside a post): left out by "Not the post you're on". */
  current?: string;
}

export interface Selection<T> {
  /** The posts to show, in order. */
  items: T[];
  /** How many matched before `skip` and `count`: "Shows 3 of 14". */
  matched: number;
  /** Picked posts that no longer exist (renamed or deleted): said in the editor, never a failed build. */
  missing: string[];
}

/** Tags compared as their addresses: "Year end", "year-end" and " YEAR END" are one tag. */
const lower = (tags: readonly string[] | undefined) => (tags ?? []).map(tagSlug).filter(Boolean);

/** Same order on every run for the same seed (a 32-bit FNV-1a hash per post). */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

const newest = (a: PostEntry, b: PostEntry) => b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title);

function sorter(order: NonNullable<PostsSource["order"]>, seed: string): (a: PostEntry, b: PostEntry) => number {
  switch (order) {
    case "oldest":
      return (a, b) => -newest(a, b);
    case "title":
      return (a, b) => a.data.title.localeCompare(b.data.title) || newest(a, b);
    case "updated":
      return (a, b) => (b.data.updated ?? b.data.date).getTime() - (a.data.updated ?? a.data.date).getTime() || newest(a, b);
    case "shuffled":
      return (a, b) => hash(seed + a.id) - hash(seed + b.id) || a.id.localeCompare(b.id);
    default:
      return newest;
  }
}

/** The posts a Posts section shows, from all the site's published posts. */
export function selectPosts<T extends PostEntry>(posts: readonly T[], source: PostsSource = {}, page: PageContext = {}): Selection<T> {
  const show = source.show ?? "newest";
  const byId = new Map(posts.map((p) => [p.id, p]));
  const missing: string[] = [];
  let list: T[];
  const here = source.notCurrent ? page.current : undefined;
  if (show === "picked") {
    list = [];
    for (const id of source.pick ?? []) {
      const p = byId.get(id);
      if (p) list.push(p);
      else missing.push(id);
    }
  } else {
    list = [...posts];
    const want = wantedTags(source.tags);
    if (show === "tagged" && want) {
      const all = source.tagMatch === "all";
      list = list.filter((p) => tagsMatch(want, p.data.tags, all));
    }
    list.sort(sorter(source.order ?? "newest", page.seed ?? ""));
    if (source.featuredFirst) list = [...list.filter((p) => p.data.featured), ...list.filter((p) => !p.data.featured)];
  }
  const out = new Set(lower(source.excludeTags));
  const ids = new Set(source.exclude ?? []);
  list = list.filter((p) => !ids.has(p.id) && !lower(p.data.tags).some((t) => out.has(t)));
  if (source.unique && page.shown) list = list.filter((p) => !page.shown?.has(p.id));
  if (here) list = list.filter((p) => p.id !== here);
  const matched = list.length;
  const from = Math.max(0, source.skip ?? 0);
  const items = list.slice(from, source.count === undefined ? undefined : from + Math.max(0, source.count));
  return { items, matched, missing };
}

// ---- The Posts widget's settings (plan/ux/widgets.md, "Widgets": Posts)

/** Every Posts setting: Source, Layout, Carousel, More items and Items, flat. */
export type PostsShape<L extends Layout> = SourceShape & LayoutShape<L> & CarouselShape & MoreShape & ItemShape;

/**
 * The Posts widget's fields, for the theme's block: `z.object({ blockType, ...header, tone,
 * ...postsSchema(z, { layouts }) })`. `layouts` is the theme's offer (the first is the default).
 */
export function postsSchema<const L extends Layout>(
  z: ZodApi,
  { layouts, count }: { layouts: readonly [L, ...L[]]; count?: number },
): PostsShape<L> & { notCurrent: Def<boolean> } {
  const { emptyText, ...source } = sourceOptions(z, count === undefined ? {} : { count });
  return {
    ...source,
    // Only where a post is beside it (a widget area on post pages); elsewhere it changes nothing.
    notCurrent: z
      .boolean()
      .default(false)
      .meta(
        meta(
          "content",
          "Source",
        )({
          title: "Not the post you're on",
          description: "Beside a post (its sidebar), that post is left out. Elsewhere this changes nothing.",
          more: true,
        }),
      ),
    emptyText,
    ...layoutOptions(z, layouts),
    ...carouselOptions(z),
    ...moreOptions(z),
    ...itemOptions(z),
  };
}

/** A Posts block's settings as parsed (or as written: every one may be left out). */
export interface PostsSettings extends PostsSource {
  layout?: string;
  more?: "link" | "loadMore" | "none";
}

/**
 * What a Posts section asks `selectPosts` for. With "Load more" it asks for everything up to
 * LOAD_MORE_CAP (all in the HTML, hidden past "How many"); a carousel holds them all too.
 */
export function sourceOf(s: PostsSettings): PostsSource {
  const show = s.show ?? "newest";
  const all = s.more === "loadMore" && s.layout !== "carousel";
  const count = s.count === undefined ? undefined : all ? Math.max(s.count, LOAD_MORE_CAP) : s.count;
  if (show === "picked") return { show, pick: s.pick ?? [], count, unique: s.unique, notCurrent: s.notCurrent };
  return {
    show,
    ...(show === "tagged" ? { tags: s.tags ?? [], tagMatch: s.tagMatch ?? "any" } : {}),
    excludeTags: s.excludeTags,
    exclude: s.exclude,
    featuredFirst: s.featuredFirst,
    order: s.order,
    count,
    skip: s.skip,
    unique: s.unique,
    notCurrent: s.notCurrent,
  };
}

/** A Posts section's posts on its page. */
export interface PostsSelection<T> extends Selection<T> {
  /** How many of `items` show at first (the rest wait for "Load more"). */
  visible: number;
  /** Why nothing shows, for the editor's dashed box ("No posts are tagged VAT"). */
  reason?: string;
}

/**
 * Every Posts section on a page, top to bottom (saved sections already in their place): the
 * selection per block index, undefined for other blocks. What a section shows is "already shown" to
 * the sections under it ("Not already shown on this page"); hidden "Load more" posts are not.
 */
export function selectPage<T extends PostEntry>(
  blocks: readonly unknown[],
  posts: readonly T[],
  { seed, current }: { seed?: string; current?: string } = {},
): (PostsSelection<T> | undefined)[] {
  const shown = new Set<string>();
  return blocks.map((b) => {
    if ((b as { blockType?: unknown } | null | undefined)?.blockType !== "posts") return undefined;
    const s = b as PostsSettings;
    const page = { shown, seed, current };
    const sel = selectPosts(posts, sourceOf(s), page);
    const visible = Math.min(sel.items.length, s.count ?? sel.items.length);
    const reason = sel.items.length ? undefined : whyEmpty(posts, s, page);
    for (const p of sel.items.slice(0, visible)) shown.add(p.id);
    return { ...sel, visible, ...(reason ? { reason } : {}) };
  });
}

const list = (tags: readonly string[], and: string) =>
  tags.length < 2
    ? `"${tags[0] ?? ""}"`
    : `${tags
        .slice(0, -1)
        .map((t) => `"${t}"`)
        .join(", ")} ${and} "${tags[tags.length - 1]}"`;

/** Why a Posts section shows nothing, and what to change: said in the editor, never to visitors. */
export function whyEmpty(posts: readonly PostEntry[], s: PostsSettings, page: PageContext = {}): string {
  if (!posts.length) return "There are no posts yet.";
  const src = sourceOf(s);
  if (src.show === "picked") {
    if (!src.pick?.length) return "No posts are picked yet: add some under Show.";
    const r = selectPosts(posts, { ...src, unique: false, count: undefined });
    if (!r.items.length) return "The picked posts no longer exist (renamed or deleted): pick others.";
    if (!selectPosts(posts, { ...src, unique: false, count: undefined }, page).items.length)
      return "The only picked post is the one you're on (Not the post you're on).";
  }
  const open = { ...src, excludeTags: undefined, exclude: undefined, unique: false, notCurrent: false, skip: 0, count: undefined };
  if (!selectPosts(posts, open, page).matched) {
    const tags = src.tags ?? [];
    if (src.tagMatch === "all" && tags.length > 1 && selectPosts(posts, { ...open, tagMatch: "any" }).matched)
      return `No posts are tagged ${list(tags, "and")}: try "Any of them".`;
    return `No posts are tagged ${list(tags, "or")}: pick another tag.`;
  }
  if (!selectPosts(posts, { ...src, unique: false, notCurrent: false, skip: 0, count: undefined }, page).matched)
    return "Every post that matches is left out (Leave out tags, Leave out posts).";
  if (!selectPosts(posts, { ...src, unique: false, skip: 0, count: undefined }, page).matched)
    return "The only post that matches is the one you're on (Not the post you're on).";
  if (!selectPosts(posts, { ...src, skip: 0, count: undefined }, page).matched)
    return 'Every post that matches is already shown by a section above ("Not already shown on this page").';
  const n = selectPosts(posts, { ...src, skip: 0, count: undefined }, page).matched;
  return `"Skip the first" leaves out all ${n} posts that match.`;
}

// ---- What a section shows, in words (the editor's "Shows 3 of 14 posts tagged Tax, newest first")

const ORDER_WORDS: Record<NonNullable<PostsSource["order"]>, string> = {
  newest: "newest first",
  oldest: "oldest first",
  title: "A to Z",
  updated: "last updated first",
  shuffled: "shuffled",
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const tagList = (tags: readonly string[], and: string) =>
  tags.length < 2 ? (tags[0] ?? "") : `${tags.slice(0, -1).join(", ")} ${and} ${tags[tags.length - 1]}`;

export interface SelectionSummary {
  /** "Shows 3 of 14 posts tagged Tax, newest first." */
  text: string;
  /** Nothing shows: why, and what to change (whyEmpty). */
  empty?: string;
  /** Picked posts that no longer exist. */
  missing: string[];
}

/**
 * What a Posts section shows, said in a sentence for the editor: how many of how many match, which,
 * in what order. `sel` is the section's own selection on its page (selectPage), so "Not already
 * shown on this page" is counted.
 */
export function summarise(posts: readonly PostEntry[], s: PostsSettings, sel: PostsSelection<PostEntry>): SelectionSummary {
  const src = sourceOf(s);
  const missing = sel.missing;
  if (!sel.items.length) return { text: "Shows no posts.", empty: sel.reason ?? whyEmpty(posts, s), missing };
  const shown = sel.visible;
  const from = src.show === "picked" ? 0 : Math.max(0, src.skip ?? 0);
  const all = from === 0 && shown === sel.matched;
  if (src.show === "picked")
    return {
      text: all ? `Shows ${plural(shown, "picked post")}, in the order picked.` : `Shows ${shown} of ${sel.matched} picked posts.`,
      missing,
    };
  const tags = src.show === "tagged" ? (src.tags ?? []).map((t) => t.trim()).filter(Boolean) : [];
  const which = tags.length ? ` tagged ${tagList(tags, src.tagMatch === "all" ? "and" : "or")}` : "";
  const order = `${src.featuredFirst ? "featured first, then " : ""}${ORDER_WORDS[src.order ?? "newest"]}`;
  if (all && shown === 1) return { text: `Shows the only post${which}.`, missing };
  const count = all ? `all ${shown} posts${which}` : `${shown} of ${plural(sel.matched, "post")}${which}`;
  const skipped = from > 0 ? `, after skipping the first ${from}` : "";
  const more = sel.items.length > shown ? `. Load more shows ${s.count ?? shown} more each time` : "";
  return { text: `Shows ${count}, ${order}${skipped}${more}.`, missing };
}

// ---- Tags

/**
 * A tag's address part: "Year end" → "year-end" (tags differing only in case, spacing or
 * punctuation are one). Latin letters lose their accents ("Café" → "cafe"); every other script's
 * letters stay as they are ("税金" → "税金", "Налоги" → "налоги"), so each tag gets a real address.
 * A "+" or "#" right after a letter or number is a word ("C++" → "c-plus-plus", "C#" → "c-sharp"),
 * so those don't all become "c"; one at the start ("#tax") is dropped. A tag with no letter or
 * number ("!!!") has none (""): it has no page and selects nothing.
 */
export const tagSlug = (tag: string) =>
  tag
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/([\p{L}\p{M}\p{N}])([+#]+)/gu, (_, c: string, signs: string) => c + signs.replace(/\+/g, "-plus").replace(/#/g, "-sharp"))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The tags a section chose, as slugs: `null` when it chose none (every item can show). Chosen tags
 * none of which has a slug ("!!!") give an empty list, which matches nothing, never everything.
 */
export function wantedTags(tags: readonly string[] | undefined): string[] | null {
  const given = (tags ?? []).filter((t) => typeof t === "string" && t.trim());
  return given.length ? [...new Set(given.map(tagSlug).filter(Boolean))] : null;
}

/** Whether an item's tags match the wanted ones (`any` of them, or `all`); `want` from wantedTags. */
export function tagsMatch(want: readonly string[], has: readonly string[] | undefined, all: boolean): boolean {
  if (!want.length) return false;
  const set = new Set((has ?? []).map(tagSlug).filter(Boolean));
  return all ? want.every((t) => set.has(t)) : want.some((t) => set.has(t));
}

export interface TagCount {
  slug: string;
  /** As most posts write it ("VAT" over "vat"); on a tie, as the first post does. */
  name: string;
  count: number;
}

/** The site's tags with how many posts have each, most used first (then A to Z). */
export const tagsOf = (posts: readonly PostEntry[]): TagCount[] => countTags(posts.map((p) => p.data.tags));

/** Tags with how many items have each (one list of tags per item), most used first (then A to Z). */
export function countTags(lists: readonly (readonly string[] | undefined)[]): TagCount[] {
  const by = new Map<string, { names: Map<string, number>; count: number }>();
  for (const tags of lists) {
    for (const slug of new Set((tags ?? []).map(tagSlug).filter(Boolean))) {
      const t = by.get(slug) ?? { names: new Map(), count: 0 };
      t.count++;
      by.set(slug, t);
    }
    for (const name of tags ?? []) {
      const t = by.get(tagSlug(name));
      if (t) t.names.set(name.trim(), (t.names.get(name.trim()) ?? 0) + 1);
    }
  }
  return [...by]
    .map(([slug, t]) => ({ slug, count: t.count, name: [...t.names].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** How many words a text has (what reading time counts). */
export const wordCount = (text: string) => text.match(/\S+/g)?.length ?? 0;

/** Minutes to read `words` words (about 220 a minute), at least 1. */
export const minutesFor = (words: number) => Math.max(1, Math.round(words / 220));

/** Minutes to read a post's text (about 220 words a minute), at least 1. */
export const readingMinutes = (text: string) => minutesFor(wordCount(text));

/**
 * A post's reading time as the theme shows it: from its text when the site builds, from its word
 * count in Craeft's render Worker (which is sent the count, not the text). None for an empty post.
 */
export function postMinutes(post: { body?: string; words?: number }): number | undefined {
  if (post.body) return readingMinutes(post.body);
  return post.words ? minutesFor(post.words) : undefined;
}
