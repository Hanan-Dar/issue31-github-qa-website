// The Tag list widget (plan/ux/widgets.md, Wave 3): the blog's tags as a cloud or a list, each
// linking to its tag page, with how many posts it has if wanted. Plain data in, data out, so the
// site's build and the editor's "Shows 8 of 12 tags" agree. The theme draws it.
import { type Def, meta, type ZodApi } from "./options.ts";
import { type PostEntry, type TagCount, tagsOf } from "./posts.ts";

export const TAG_LIST_STYLES = ["cloud", "list"] as const;
export const TAG_LIST_ORDER = ["count", "name"] as const;

export interface TagListShape {
  style: Def<(typeof TAG_LIST_STYLES)[number]>;
  counts: Def<boolean>;
  order: Def<(typeof TAG_LIST_ORDER)[number]>;
  max: Def<number>;
  minPosts: Def<number>;
}

/** The Tag list's fields, for the theme's block: `z.object({ blockType, ...header, ...tagListSchema(z) })`. */
export function tagListSchema(z: ZodApi): TagListShape {
  const src = meta("content", "Source");
  const look = meta("style", "Tags");
  return {
    order: z
      .enum(TAG_LIST_ORDER)
      .default("count")
      .meta(src({ title: "Order", labels: { count: "Most used first", name: "A to Z" } })),
    max: z
      .number()
      .int()
      .min(1)
      .max(60)
      .default(20)
      .meta(src({ title: "How many", description: "The most tags shown (1 to 60): the most used ones when there are more." })),
    minPosts: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(1)
      .meta(src({ title: "Only tags with at least", description: "Posts a tag needs to be shown (1 to 10).", more: true })),
    style: z
      .enum(TAG_LIST_STYLES)
      .default("cloud")
      .meta(look({ title: "Style", labels: { cloud: "Cloud (more posts, larger)", list: "List" } })),
    counts: z
      .boolean()
      .default(false)
      .meta(look({ title: "How many posts each has", description: "Shown beside each tag." })),
  };
}

export interface TagListSettings {
  style?: (typeof TAG_LIST_STYLES)[number];
  counts?: boolean;
  order?: (typeof TAG_LIST_ORDER)[number];
  max?: number;
  minPosts?: number;
}

/** A tag as the widget shows it: its size in a cloud, 1 (fewest posts) to 5 (most). */
export interface ShownTag extends TagCount {
  size: 1 | 2 | 3 | 4 | 5;
}

export interface TagListSelection {
  items: ShownTag[];
  /** How many tags have enough posts: "Shows 8 of 12 tags". */
  matched: number;
  /** Why nothing shows (the editor's dashed box). */
  reason?: string;
}

/** A cloud's sizes: by posts on a log scale, so one busy tag doesn't make the rest all the smallest. */
function sizes(tags: readonly TagCount[]): Map<string, ShownTag["size"]> {
  const counts = tags.map((t) => t.count);
  const lo = Math.log(Math.min(...counts));
  const hi = Math.log(Math.max(...counts));
  return new Map(
    tags.map((t) => [t.slug, (hi === lo ? 3 : 1 + Math.round((4 * (Math.log(t.count) - lo)) / (hi - lo))) as ShownTag["size"]]),
  );
}

/** The tags a Tag list shows, from the site's published posts. */
export function selectTags(posts: readonly PostEntry[], s: TagListSettings = {}): TagListSelection {
  const all = tagsOf(posts);
  const enough = all.filter((t) => t.count >= (s.minPosts ?? 1));
  // The most used ones, then in the order asked for.
  const kept = enough.slice(0, s.max ?? 20);
  if (s.order === "name") kept.sort((a, b) => a.name.localeCompare(b.name));
  const size = sizes(kept.length ? kept : [{ slug: "", name: "", count: 1 }]);
  const items = kept.map((t) => ({ ...t, size: size.get(t.slug) ?? 3 }));
  const reason = items.length
    ? undefined
    : !posts.length
      ? "There are no posts yet."
      : !all.length
        ? "No post has a tag yet: add tags to posts in Pages and posts."
        : `No tag has ${s.minPosts} posts or more: lower "Only tags with at least".`;
  return { items, matched: enough.length, ...(reason ? { reason } : {}) };
}

/** What a Tag list shows, in a sentence for the editor. */
export function summariseTags(sel: TagListSelection, s: TagListSettings = {}): string {
  if (!sel.items.length) return "Shows no tags.";
  const order = s.order === "name" ? "A to Z" : "most used first";
  const n = sel.items.length;
  return n === sel.matched ? `Shows all ${n === 1 ? "1 tag" : `${n} tags`}, ${order}.` : `Shows ${n} of ${sel.matched} tags, ${order}.`;
}
