// Widgets' option groups (plan/ux/widgets.md, "Option groups"): Source, Layout, Carousel, More items
// and Items, each a factory that takes the caller's `z` (the theme's `astro/zod`), so this package
// never imports zod and a site has one copy of it. Every group is a FLAT shape (one field per
// option): editors draw optional nested objects as "Add …" buttons, so the group is only metadata.
//
// Every field's `.meta()` is what Craeft's form reads from blocks.schema.json:
//   title, description   the label and a short hint
//   labels               enum value → what people read
//   part                 "content" (words and source) | "style" (the Look tab) | "advanced"
//   group                the fold it sits in
//   more: true           under the group's "More", not shown at once (the plan's non-bold rows)
//   showWhen             { sibling: value | value[] }: shown only while every sibling has one of them
//   format               "tags", "pick-posts", "layout", "per-device" for the fields that need their own control
// An option that stops applying (carousel settings after switching to a grid) is hidden, never
// cleared, so switching back restores it.
//
// The defaults reproduce the theme's Latest posts as it was before widgets: a grid of three, the
// "All posts" link, cards with the picture on top, the date and the summary.

/**
 * The caller's zod namespace. Typed loosely on purpose: the package can't import zod's types (a site's
 * copy has no dependencies); each factory says what it returns with `Field` instead.
 */
// biome-ignore lint/suspicious/noExplicitAny: zod's types arrive with the caller's z
export type ZodApi = any;

/**
 * A field as the caller's `z.infer` reads it (zod 4's `_zod` brand): what it gives after parsing
 * (`output`) and accepts (`input`), and whether it may be left out. The values are real zod schemas;
 * this only names their types.
 */
export interface Field<
  Out,
  In = Out,
  OptOut extends "optional" | undefined = undefined,
  OptIn extends "optional" | "defaulted" | undefined = OptOut,
> {
  readonly _zod: { output: Out; input: In; optout: OptOut; optin: OptIn };
}
/** Left out → its default. */
export type Def<T> = Field<T, T, undefined, "defaulted">;
/** May be left out. */
export type Opt<T> = Field<T | undefined, T | undefined, "optional", "optional">;

/** A value per screen size; tablet follows desktop and phone its own default when left out. */
export interface PerDevice<T> {
  desktop: T;
  tablet?: T;
  phone?: T;
}

export type Part = "content" | "style" | "advanced";
export type Group =
  | "Source"
  | "Layout"
  | "Carousel"
  | "More items"
  | "Items"
  | "Pictures"
  | "Reviews"
  | "Summary"
  | "People"
  | "Questions"
  | "Logos"
  | "Pages"
  | "Plans"
  | "Prices"
  | "Slider"
  | "Tags"
  | "Archive"
  | "Details"
  | "Links";

/** What every option's `.meta()` holds (see the top of this file). */
export interface OptionMeta {
  title: string;
  description?: string;
  labels?: Record<string, string>;
  part: Part;
  group: Group;
  more?: true;
  showWhen?: Record<string, unknown>;
  format?: string;
  /** Per-device values: what phones show when left out. */
  phoneDefault?: number | string;
  /** Per-device values: what the theme shows when none is set (tablet's only while desktop is unset too). */
  usual?: { desktop?: number | string; tablet?: number | string };
  /** A list of choices each taken once, in an order that matters (the form lets them be reordered). */
  uniqueItems?: true;
}

type Meta = Omit<OptionMeta, "part" | "group">;
export const meta = (part: Part, group: Group) => (m: Meta) => {
  const { title, description, labels, more, showWhen, format, phoneDefault, usual, uniqueItems } = m;
  // Always in the same order, so blocks.schema.json stays stable.
  return Object.fromEntries(
    Object.entries({ title, description, labels, part, group, more, showWhen, format, phoneDefault, usual, uniqueItems }).filter(
      ([, v]) => v !== undefined,
    ),
  ) as unknown as OptionMeta;
};

const perDevice = (z: ZodApi, t: unknown, m: OptionMeta) =>
  z
    .object({ desktop: t, tablet: (t as { optional(): unknown }).optional(), phone: (t as { optional(): unknown }).optional() })
    .strict()
    .meta(m)
    .optional();

// ---- Source (Query Loop's "Query", Elementor's "Query")

export const SHOW = ["newest", "picked", "tagged"] as const;
export const ORDER = ["newest", "oldest", "title", "updated", "shuffled"] as const;
export type Show = (typeof SHOW)[number];
export type Order = (typeof ORDER)[number];
/** The most a section shows at once. */
export const MAX_COUNT = 24;

export interface SourceShape {
  show: Def<Show>;
  pick: Opt<string[]>;
  tags: Opt<string[]>;
  tagMatch: Def<"any" | "all">;
  excludeTags: Opt<string[]>;
  exclude: Opt<string[]>;
  featuredFirst: Def<boolean>;
  order: Def<Order>;
  count: Def<number>;
  skip: Def<number>;
  unique: Def<boolean>;
  emptyText: Opt<string>;
}

/** Which items, in what order, how many. `noun` names the items ("posts"); `count` keeps its default. */
export function sourceOptions(z: ZodApi, { noun = "posts", count = 3 }: { noun?: string; count?: number } = {}): SourceShape {
  const m = meta("content", "Source");
  const notPicked = { show: ["newest", "tagged"] };
  return {
    show: z
      .enum(SHOW)
      .default("newest")
      .meta(
        m({
          title: "Show",
          description: `Which ${noun} this section shows.`,
          labels: { newest: "Newest", picked: "Picked by hand", tagged: "By tag" },
        }),
      ),
    pick: z
      .array(z.string())
      .optional()
      .meta(
        m({
          title: `Picked ${noun}`,
          description: "Shown in this order. One that's renamed or deleted is left out.",
          showWhen: { show: "picked" },
          format: `pick-${noun}`,
        }),
      ),
    tags: z
      .array(z.string())
      .optional()
      .meta(m({ title: "Tags", description: `${cap(noun)} with these tags.`, showWhen: { show: "tagged" }, format: "tags" })),
    tagMatch: z
      .enum(["any", "all"])
      .default("any")
      .meta(m({ title: "Tags to match", labels: { any: "Any of them", all: "All of them" }, showWhen: { show: "tagged" } })),
    excludeTags: z
      .array(z.string())
      .optional()
      .meta(
        m({
          title: "Leave out tags",
          description: `${cap(noun)} with any of these tags aren't shown.`,
          more: true,
          showWhen: notPicked,
          format: "tags",
        }),
      ),
    exclude: z
      .array(z.string())
      .optional()
      .meta(m({ title: `Leave out ${noun}`, more: true, showWhen: notPicked, format: `pick-${noun}` })),
    featuredFirst: z
      .boolean()
      .default(false)
      .meta(m({ title: "Featured first", description: `${cap(noun)} marked Featured come first.`, more: true, showWhen: notPicked })),
    order: z
      .enum(ORDER)
      .default("newest")
      .meta(
        m({
          title: "Order",
          description: "Shuffled changes only when the site changes, so everyone sees the same order.",
          labels: { newest: "Newest first", oldest: "Oldest first", title: "A to Z", updated: "Last updated", shuffled: "Shuffled" },
          showWhen: notPicked,
        }),
      ),
    count: z
      .number()
      .int()
      .min(1)
      .max(MAX_COUNT)
      .default(count)
      .meta(m({ title: "How many", description: `1 to ${MAX_COUNT}.` })),
    skip: z
      .number()
      .int()
      .min(0)
      .max(12)
      .default(0)
      .meta(
        m({ title: "Skip the first", description: `Leaves out the first ${noun} that match (0 to 12).`, more: true, showWhen: notPicked }),
      ),
    unique: z
      .boolean()
      .default(false)
      .meta(
        m({ title: "Not already shown on this page", description: `Leaves out ${noun} shown by sections above this one.`, more: true }),
      ),
    emptyText: z
      .string()
      .optional()
      .meta(
        m({ title: "When nothing matches", description: "A line shown instead. Left empty, the section isn't shown at all.", more: true }),
      ),
  };
}

// ---- Layout

/** Every layout a list of items may have; a theme offers the ones it draws. */
export const LAYOUT_LABELS = {
  grid: "Grid",
  list: "List",
  featured: "Featured",
  compact: "Compact list",
  tiles: "Picture tiles",
  carousel: "Carousel",
  masonry: "Masonry",
  quote: "One large quote",
  accordion: "Accordion",
  columns: "Two columns",
  row: "Row",
  strip: "Scrolling strip",
} as const;
export type Layout = keyof typeof LAYOUT_LABELS;
/** Layouts with columns. */
const COLUMNED: Layout[] = ["grid", "tiles", "featured", "masonry"];

export interface LayoutShape<L extends Layout> {
  layout: Def<L>;
  columns: Opt<PerDevice<number>>;
  gap: Def<"s" | "m" | "l">;
  featuredSide: Def<"left" | "top">;
  featuredWidth: Def<"half" | "two-thirds">;
  equalHeights: Def<boolean>;
  filter: Def<boolean>;
  entrance: Def<"none" | "fade" | "rise">;
}

export interface LayoutChoices {
  /** Options left out (a gallery has no equal heights, testimonials no filter buttons). */
  omit?: readonly (keyof LayoutShape<Layout>)[];
  /** What the columns usually are, and on phones. */
  columns?: { desktop: number; tablet: number; phone: number };
}

/**
 * How the items are laid out, from the layouts the theme draws (the first is the default). An
 * option that no offered layout uses is left out (featured item settings without "featured").
 */
export function layoutOptions<const L extends Layout>(
  z: ZodApi,
  layouts: readonly [L, ...L[]],
  { omit = [], columns = { desktop: 3, tablet: 2, phone: 1 } }: LayoutChoices = {},
): LayoutShape<L> {
  const m = meta("style", "Layout");
  const has = (wanted: Layout[]) => wanted.filter((l) => (layouts as readonly Layout[]).includes(l));
  const labels = Object.fromEntries(layouts.map((l) => [l, LAYOUT_LABELS[l]]));
  const all = layoutFields(z, layouts, m, has, labels, columns);
  const used: Record<string, Layout[] | undefined> = {
    columns: has(COLUMNED),
    featuredSide: has(["featured"]),
    featuredWidth: has(["featured"]),
    equalHeights: has(["grid", "carousel"]),
    filter: has(["grid", "tiles", "masonry"]),
  };
  return Object.fromEntries(
    Object.entries(all).filter(([k]) => !omit.includes(k as keyof LayoutShape<Layout>) && used[k]?.length !== 0),
  ) as unknown as LayoutShape<L>;
}

function layoutFields(
  z: ZodApi,
  layouts: readonly Layout[],
  m: (x: Meta) => OptionMeta,
  has: (wanted: Layout[]) => Layout[],
  labels: Record<string, string>,
  cols: { desktop: number; tablet: number; phone: number },
) {
  return {
    layout: z
      .enum(layouts)
      .default(layouts[0])
      .meta(m({ title: "Layout", labels, format: "layout" })),
    columns: perDevice(
      z,
      z.number().int().min(1).max(6),
      m({
        title: "Columns",
        description: cols.phone === 1 ? "1 to 6. Phones show one unless set." : `1 to 6. Phones show ${cols.phone} unless set.`,
        showWhen: { layout: has(COLUMNED) },
        format: "per-device",
        phoneDefault: cols.phone,
        usual: { desktop: cols.desktop, tablet: cols.tablet },
      }),
    ),
    gap: z
      .enum(["s", "m", "l"])
      .default("m")
      .meta(m({ title: "Space between", labels: { s: "Small", m: "Medium", l: "Large" }, more: true })),
    featuredSide: z
      .enum(["left", "top"])
      .default("left")
      .meta(
        m({
          title: "Featured item",
          description: "The large one: beside the others, or above them.",
          labels: { left: "Left", top: "Top" },
          showWhen: { layout: "featured" },
        }),
      ),
    featuredWidth: z
      .enum(["half", "two-thirds"])
      .default("half")
      .meta(
        m({
          title: "Featured item's width",
          labels: { half: "Half", "two-thirds": "Two thirds" },
          more: true,
          showWhen: { layout: "featured", featuredSide: "left" },
        }),
      ),
    equalHeights: z
      .boolean()
      .default(true)
      .meta(
        m({
          title: "Equal heights",
          description: "Cards in a row are as tall as the tallest.",
          more: true,
          showWhen: { layout: has(["grid", "carousel"]) },
        }),
      ),
    filter: z
      .boolean()
      .default(false)
      .meta(
        m({
          title: "Filter buttons",
          description: "A button per tag above the items; pressing one shows only those.",
          showWhen: { layout: has(["grid", "tiles", "masonry"]) },
        }),
      ),
    entrance: z
      .enum(["none", "fade", "rise"])
      .default("none")
      .meta(
        m({
          title: "Entrance",
          description: "How items appear as the page scrolls to them. Never for people who ask for less motion.",
          labels: { none: "None", fade: "Fade in", rise: "Rise" },
          more: true,
        }),
      ),
  };
}

// ---- Carousel

export interface CarouselShape {
  carouselView: Opt<PerDevice<number>>;
  carouselPeek: Def<boolean>;
  arrows: Def<"beside" | "under" | "none">;
  dots: Def<boolean>;
  autoplay: Def<number>;
  carouselScroll: Def<"item" | "view">;
  carouselEnd: Def<"stop" | "start">;
}

/** A carousel's settings, shown only while the layout is "carousel". */
export function carouselOptions(z: ZodApi): CarouselShape {
  const m = meta("style", "Carousel");
  const when = { layout: "carousel" };
  return {
    carouselView: perDevice(
      z,
      z.number().int().min(1).max(6),
      m({
        title: "Items in view",
        description: "1 to 6.",
        showWhen: when,
        format: "per-device",
        phoneDefault: 1,
        usual: { desktop: 3, tablet: 2 },
      }),
    ),
    carouselPeek: z
      .boolean()
      .default(true)
      .meta(m({ title: "Show part of the next one", description: "So people can see there's more.", more: true, showWhen: when })),
    arrows: z
      .enum(["beside", "under", "none"])
      .default("beside")
      .meta(m({ title: "Arrows", labels: { beside: "Beside", under: "Under", none: "None" }, showWhen: when })),
    dots: z
      .boolean()
      .default(true)
      .meta(m({ title: "Dots", description: "A count instead past 10 items.", showWhen: when })),
    autoplay: z
      .number()
      .int()
      .min(0)
      .max(10)
      .refine((n: number) => n === 0 || n >= 3, "Off (0), or every 3 to 10 seconds")
      .default(0)
      .meta(
        m({
          title: "Autoplay",
          description:
            "Off (0), or moves on every 3 to 10 seconds. It always has a pause button, and stops on hover, focus and for people who ask for less motion.",
          showWhen: when,
        }),
      ),
    carouselScroll: z
      .enum(["item", "view"])
      .default("item")
      .meta(m({ title: "Scroll by", labels: { item: "One item", view: "A full view" }, more: true, showWhen: when })),
    carouselEnd: z
      .enum(["stop", "start"])
      .default("stop")
      .meta(m({ title: "At the end", labels: { stop: "Stop", start: "Back to the start" }, more: true, showWhen: when })),
  };
}

// ---- More items (Elementor's "Pagination", static)

/** How many a "Load more" section holds in its HTML (hidden past "How many"). */
export const LOAD_MORE_CAP = 48;

export interface MoreShape {
  more: Def<"link" | "loadMore" | "none">;
  moreText: Opt<string>;
}

/** What follows the items: a link to all of them (the default), a "Load more" button, or nothing. */
export function moreOptions(z: ZodApi, { noun = "posts" }: { noun?: string } = {}): MoreShape {
  const m = meta("style", "More items");
  return {
    more: z
      .enum(["link", "loadMore", "none"])
      .default("link")
      .meta(
        m({
          title: "More",
          description: `Load more shows the next "How many" with each press, up to ${LOAD_MORE_CAP}.`,
          labels: { link: `A link to all ${noun}`, loadMore: "Load more", none: "None" },
        }),
      ),
    moreText: z
      .string()
      .optional()
      .meta(
        m({ title: "Its text", description: "Left empty, the site's own words.", more: true, showWhen: { more: ["link", "loadMore"] } }),
      ),
  };
}

// ---- Items (Elementor's Box, Image, Content and Meta data; Latest Posts' display settings)

export const ITEM_PARTS = ["date", "author", "tags", "readingTime", "summary", "readMore"] as const;
export type ItemPart = (typeof ITEM_PARTS)[number];

export interface ItemShape {
  cardStyle: Def<"plain" | "bordered" | "raised">;
  picture: Def<boolean>;
  pictureShape: Def<"wide" | "standard" | "square" | "tall" | "natural">;
  picturePosition: Def<"top" | "left" | "behind">;
  pictureHover: Def<"none" | "zoom" | "darken">;
  parts: Def<ItemPart[]>;
  summaryLength: Def<"one" | "three" | "all">;
  titleSize: Def<"s" | "m" | "l">;
  readMoreText: Opt<string>;
}

/** How each item looks, in the theme's own steps. */
export function itemOptions(z: ZodApi): ItemShape {
  const m = meta("style", "Items");
  const pictured = { picture: true };
  return {
    cardStyle: z
      .enum(["plain", "bordered", "raised"])
      .default("raised")
      .meta(m({ title: "Card style", labels: { plain: "Plain", bordered: "Bordered", raised: "Raised" } })),
    picture: z
      .boolean()
      .default(true)
      .meta(m({ title: "Picture", description: "The post's featured image, when it has one." })),
    pictureShape: z
      .enum(["wide", "standard", "square", "tall", "natural"])
      .default("wide")
      .meta(
        m({
          title: "Picture shape",
          labels: { wide: "16:9", standard: "4:3", square: "1:1", tall: "3:4", natural: "As it is" },
          showWhen: pictured,
        }),
      ),
    picturePosition: z
      .enum(["top", "left", "behind"])
      .default("top")
      .meta(
        m({ title: "Picture position", labels: { top: "Top", left: "Left", behind: "Behind the words" }, more: true, showWhen: pictured }),
      ),
    pictureHover: z
      .enum(["none", "zoom", "darken"])
      .default("none")
      .meta(m({ title: "Picture on hover", labels: { none: "None", zoom: "Zoom", darken: "Darken" }, more: true, showWhen: pictured })),
    parts: z
      .array(z.enum(ITEM_PARTS))
      .refine((a: string[]) => new Set(a).size === a.length, "Each part once")
      .default(["date", "summary"])
      .meta(
        m({
          title: "Parts shown",
          uniqueItems: true,
          description: "Each on or off, in the order shown. The title is always shown, after the first date, author, tags or reading time.",
          labels: {
            date: "Date",
            author: "Author",
            tags: "Tags",
            readingTime: "Reading time",
            summary: "Summary",
            readMore: '"Read more"',
          },
        }),
      ),
    summaryLength: z
      .enum(["one", "three", "all"])
      .default("all")
      .meta(m({ title: "Summary length", labels: { one: "1 line", three: "3 lines", all: "All of it" }, more: true })),
    titleSize: z
      .enum(["s", "m", "l"])
      .default("m")
      .meta(m({ title: "Title size", labels: { s: "Small", m: "Medium", l: "Large" }, more: true })),
    readMoreText: z
      .string()
      .optional()
      .meta(m({ title: '"Read more" text', description: "Left empty, the site's own words.", more: true })),
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
