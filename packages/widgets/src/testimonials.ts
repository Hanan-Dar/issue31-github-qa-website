// The Testimonials widget (plan/ux/widgets.md, "Widgets": Testimonials): the reviews typed in the
// section (as before widgets), or the site's testimonials (src/content/testimonials/<id>.yaml) by
// tag; as a grid, a carousel or one large quote; stars only when every review shown has a rating; an
// optional summary line ("4.9 from 120 Google reviews", typed, with a link). No review JSON-LD:
// Google ignores a business's own reviews for star results.
import { carouselOptions, type Def, type Layout, layoutOptions, meta, type Opt, type ZodApi } from "./options.ts";
import { bySetOrder } from "./collection.ts";
import { countTags, hash, type Selection, type TagCount, tagsMatch, wantedTags } from "./posts.ts";

/** A review as the theme draws it (a typed item, or a testimonial's file). */
export interface Review {
  quote: string;
  name: string;
  /** A typed item's line under the name ("Boiler replacement, Headingley"). */
  detail?: string;
  role?: string;
  company?: string;
  photo?: { src: string; alt: string };
  /** Stars out of 5. */
  rating?: number;
  tags?: string[];
  /** A testimonial's place in "In their set order" (lower first; then by file name). */
  position?: number;
}

/** A testimonial's file as the theme reads it (an Astro content entry has this shape). */
export interface ReviewEntry<R extends Review = Review> {
  id: string;
  data: R;
}

export const REVIEWS_SHOW = ["items", "collection"] as const;
export const REVIEWS_ORDER = ["as-is", "rating", "shuffled"] as const;
/** The most reviews a section shows. */
export const MAX_REVIEWS = 24;

/** Where the reviews come from: typed here, or the site's testimonials (by tag, in an order, how many). */
export function reviewSourceOptions(z: ZodApi) {
  const m = meta("content", "Source");
  const shared = { show: "collection" };
  return {
    show: z
      .enum(REVIEWS_SHOW)
      .default("items")
      .meta(
        m({
          title: "Show",
          description:
            "Reviews typed here, or the site's testimonials: reviews kept once that other sections can show too (Pages and posts lists them).",
          labels: { items: "These reviews", collection: "The site's testimonials" },
        }),
      ) as Def<(typeof REVIEWS_SHOW)[number]>,
    tags: z
      .array(z.string())
      .optional()
      .meta(
        m({
          title: "Tags",
          description: "Only testimonials with these tags; left empty, all of them.",
          showWhen: shared,
          format: "testimonial-tags",
        }),
      ) as Opt<string[]>,
    tagMatch: z
      .enum(["any", "all"])
      .default("any")
      .meta(m({ title: "Tags to match", labels: { any: "Any of them", all: "All of them" }, more: true, showWhen: shared })) as Def<
      "any" | "all"
    >,
    order: z
      .enum(REVIEWS_ORDER)
      .default("as-is")
      .meta(
        m({
          title: "Order",
          description: "In their set order: by each one's Position, then its file name. Shuffled changes only when the site changes.",
          labels: { "as-is": "In their set order", rating: "Highest rated first", shuffled: "Shuffled" },
          showWhen: shared,
        }),
      ) as Def<(typeof REVIEWS_ORDER)[number]>,
    count: z
      .number()
      .int()
      .min(1)
      .max(MAX_REVIEWS)
      .optional()
      .meta(m({ title: "How many", description: `Left empty, all of them (up to ${MAX_REVIEWS}).`, showWhen: shared })) as Opt<number>,
  };
}

/** The summary line under the title ("4.9 from 120 Google reviews"), typed, with an optional link. */
export function summaryOptions(z: ZodApi) {
  const m = meta("content", "Summary");
  return {
    summary: z
      .string()
      .max(120)
      .optional()
      .meta(
        m({ title: "Summary line", description: 'Typed as you want it read, e.g. "4.9 from 120 Google reviews". Keep it true.' }),
      ) as Opt<string>,
    summaryLink: z
      .string()
      .optional()
      .meta(m({ title: "Its link", description: "Where the reviews are, e.g. your Google profile.", format: "link" })) as Opt<string>,
  };
}

/** How each review looks. */
export function reviewOptions(z: ZodApi) {
  const m = meta("style", "Reviews");
  return {
    cardStyle: z
      .enum(["plain", "bordered", "raised"])
      .default("raised")
      .meta(m({ title: "Card style", labels: { plain: "Plain", bordered: "Bordered", raised: "Raised" } })) as Def<
      "plain" | "bordered" | "raised"
    >,
    stars: z
      .boolean()
      .default(true)
      .meta(m({ title: "Stars", description: "Shown only when every review shown has a rating." })) as Def<boolean>,
    photos: z
      .boolean()
      .default(true)
      .meta(m({ title: "Photos", description: "A testimonial's photo beside the name, when it has one." })) as Def<boolean>,
  };
}

/**
 * The Testimonials widget's fields, for the theme's block: `z.object({ blockType, ...header, tone,
 * items, ...testimonialsSchema(z, { layouts }) })`; the typed `items` stay the theme's own.
 */
export function testimonialsSchema<const L extends Layout>(z: ZodApi, { layouts }: { layouts: readonly [L, ...L[]] }) {
  return {
    ...reviewSourceOptions(z),
    ...summaryOptions(z),
    ...layoutOptions(z, layouts, { omit: ["filter"] }),
    ...carouselOptions(z),
    ...reviewOptions(z),
  };
}

/** A Testimonials block's settings as parsed (or as written: every one may be left out). */
export interface ReviewsSettings<R extends Review = Review> {
  show?: (typeof REVIEWS_SHOW)[number];
  items?: R[];
  tags?: string[];
  tagMatch?: "any" | "all";
  order?: (typeof REVIEWS_ORDER)[number];
  count?: number;
  layout?: string;
  stars?: boolean;
}

export interface ReviewsSelection<R extends Review = Review> extends Selection<R> {
  /** Whether stars show: every review shown has a rating (typed reviews keep each one's own, as before widgets). */
  stars: "each" | "all" | "none";
  /** Why nothing shows, for the editor. */
  reason?: string;
}

/**
 * The reviews a Testimonials section shows. `collection`: the site's testimonials (only read when
 * the section shows them). One large quote shows the first.
 */
export function selectReviews<R extends Review>(
  s: ReviewsSettings<R>,
  collection: readonly ReviewEntry<R>[] = [],
  { seed = "" }: { seed?: string } = {},
): ReviewsSelection<R> {
  let list: R[];
  let all: number;
  if (s.show === "collection") {
    let entries = [...collection].sort(bySetOrder);
    all = entries.length;
    const want = wantedTags(s.tags);
    if (want) {
      const every = s.tagMatch === "all";
      entries = entries.filter((e) => tagsMatch(want, e.data.tags, every));
    }
    if (s.order === "rating") entries.sort((a, b) => (b.data.rating ?? 0) - (a.data.rating ?? 0) || a.id.localeCompare(b.id));
    if (s.order === "shuffled") entries.sort((a, b) => hash(seed + a.id) - hash(seed + b.id) || a.id.localeCompare(b.id));
    list = entries.map((e) => e.data);
  } else {
    list = [...(s.items ?? [])];
    all = list.length;
  }
  const matched = list.length;
  const limit = s.layout === "quote" ? 1 : s.show === "collection" ? (s.count ?? MAX_REVIEWS) : list.length;
  const items = list.slice(0, limit);
  // Typed reviews: each with its own stars, as before widgets (nothing changes by itself). The
  // site's testimonials: stars only when every one shown has a rating, so none looks unrated.
  const stars =
    s.stars === false ? "none" : s.show === "collection" ? (items.length && items.every((r) => r.rating) ? "all" : "none") : "each";
  const out: ReviewsSelection<R> = { items, matched, missing: [], stars };
  if (!items.length)
    out.reason =
      s.show !== "collection"
        ? "No reviews are typed yet: add some under Reviews."
        : !all
          ? "The site has no testimonials yet (src/content/testimonials/)."
          : `No testimonial is tagged ${(s.tags ?? []).map((t) => `"${t}"`).join(s.tagMatch === "all" ? " and " : " or ")}: pick another tag.`;
  return out;
}

/** The site's testimonials' tags, with how many each has. */
export const reviewTags = (collection: readonly ReviewEntry[]): TagCount[] => countTags(collection.map((e) => e.data.tags));

/** A review's line under the name: a typed item's detail, else its role and company. */
export const reviewDetail = (r: Review): string | undefined => r.detail ?? ([r.role, r.company].filter(Boolean).join(", ") || undefined);

/** What a Testimonials section shows, in a sentence for the editor. */
export function summariseReviews(s: ReviewsSettings, sel: ReviewsSelection): { text: string; empty?: string; missing: string[] } {
  if (!sel.items.length) return { text: "Shows no reviews.", empty: sel.reason, missing: [] };
  const n = sel.items.length;
  if (s.show !== "collection")
    return {
      text:
        s.layout === "quote" && sel.matched > 1
          ? `Shows the first of ${sel.matched} reviews typed here, large.`
          : `Shows ${n === 1 ? "the review" : `all ${n} reviews`} typed here.`,
      missing: [],
    };
  const tags = (s.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const which = tags.length ? ` tagged ${tags.join(s.tagMatch === "all" ? " and " : " or ")}` : "";
  const order = { "as-is": "in their set order", rating: "highest rated first", shuffled: "shuffled" }[s.order ?? "as-is"];
  const count = n === sel.matched ? (n === 1 ? "the only testimonial" : `all ${n} testimonials`) : `${n} of ${sel.matched} testimonials`;
  const stars = s.stars !== false && sel.stars === "none" ? " No stars: not every one shown has a rating." : "";
  return { text: `Shows ${count}${which}, ${order}.${stars}`, missing: [] };
}
