// The Child pages widget (plan/ux/widgets.md, "Wave 2"): cards for the pages under one part of the
// site (/services: every page under it, so a page added there shows by itself), or pages picked by
// hand; as a grid, a list or a carousel. Each card's title and text come from its page (its title,
// its hero's lead or its search description), as the Links block's do; switched-off pages are left out.
import { carouselOptions, type Def, type Layout, layoutOptions, meta, type Opt, type ZodApi } from "./options.ts";
import type { Selection } from "./posts.ts";

/** A page as a card shows it: its address, title, text and picture (the theme reads them from the page). */
export interface PageCard {
  path: string;
  title: string;
  text?: string;
  image?: { src: string; alt: string };
}

export const CHILD_SHOW = ["under", "picked"] as const;
export const CHILD_ORDER = ["title", "path"] as const;
/** The most cards a section shows. */
export const MAX_PAGES = 24;

/** Which pages: those under an address (the next level, or every level), or picked ones. */
export function childSourceOptions(z: ZodApi) {
  const m = meta("content", "Source");
  const under = { show: "under" };
  return {
    show: z
      .enum(CHILD_SHOW)
      .default("under")
      .meta(
        m({
          title: "Show",
          description: "The pages under one page (new ones there join by themselves), or pages picked by hand.",
          labels: { under: "The pages under a page", picked: "Pages picked by hand" },
        }),
      ) as Def<(typeof CHILD_SHOW)[number]>,
    under: z
      .string()
      .regex(/^\/[a-z0-9/_-]*$/)
      .optional()
      .meta(
        m({
          title: "Under",
          description: "A page's address, e.g. /services. Left empty, the page this section is on.",
          showWhen: under,
          format: "link",
        }),
      ) as Opt<string>,
    depth: z
      .enum(["next", "all"])
      .default("next")
      .meta(
        m({
          title: "Which",
          labels: { next: "Only the next level", all: "Every level under it" },
          more: true,
          showWhen: under,
        }),
      ) as Def<"next" | "all">,
    pick: z
      .array(z.string().regex(/^\//))
      .optional()
      .meta(
        m({
          title: "Pages",
          description: "Shown in this order. One that's switched off or gone is left out.",
          showWhen: { show: "picked" },
          format: "pick-pages",
        }),
      ) as Opt<string[]>,
    order: z
      .enum(CHILD_ORDER)
      .default("title")
      .meta(m({ title: "Order", labels: { title: "A to Z", path: "By address" }, showWhen: under })) as Def<(typeof CHILD_ORDER)[number]>,
    count: z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGES)
      .optional()
      .meta(m({ title: "How many", description: `Left empty, all of them (up to ${MAX_PAGES}).` })) as Opt<number>,
  };
}

/** How each card looks. */
export function cardOptions(z: ZodApi) {
  const m = meta("style", "Pages");
  return {
    cardStyle: z
      .enum(["plain", "bordered", "raised"])
      .default("raised")
      .meta(m({ title: "Card style", labels: { plain: "Plain", bordered: "Bordered", raised: "Raised" } })) as Def<
      "plain" | "bordered" | "raised"
    >,
    pictures: z
      .boolean()
      .default(true)
      .meta(m({ title: "Pictures", description: "Each page's hero picture, when it has one." })) as Def<boolean>,
    text: z
      .boolean()
      .default(true)
      .meta(m({ title: "Text", description: "A line from each page: its hero's text, else its search description." })) as Def<boolean>,
    linkText: z
      .string()
      .max(40)
      .optional()
      .meta(m({ title: "Link text", description: 'Left empty, "Read more".', more: true })) as Opt<string>,
  };
}

/** The Child pages widget's fields, for the theme's block. */
export function childPagesSchema<const L extends Layout>(z: ZodApi, { layouts }: { layouts: readonly [L, ...L[]] }) {
  return {
    ...childSourceOptions(z),
    ...layoutOptions(z, layouts, { omit: ["filter", "entrance"] }),
    ...carouselOptions(z),
    ...cardOptions(z),
  };
}

export interface ChildPagesSettings {
  show?: (typeof CHILD_SHOW)[number];
  under?: string;
  depth?: "next" | "all";
  pick?: string[];
  order?: (typeof CHILD_ORDER)[number];
  count?: number;
}

export interface ChildPagesSelection<P extends PageCard = PageCard> extends Selection<P> {
  /** The address whose pages are shown ("under"). */
  under?: string;
  reason?: string;
}

const clean = (p: string) => (p.replace(/\/+$/, "") || "/").toLowerCase();

/**
 * The pages a Child pages section shows, from the site's built pages (switched-off ones already
 * left out). `here`: the address of the page the section is on (the default for "Under").
 */
export function selectChildPages<P extends PageCard>(
  s: ChildPagesSettings,
  pages: readonly P[],
  { here = "/" }: { here?: string } = {},
): ChildPagesSelection<P> {
  const byPath = new Map(pages.map((p) => [clean(p.path), p]));
  const count = s.count ?? MAX_PAGES;
  if (s.show === "picked") {
    const missing: string[] = [];
    const list: P[] = [];
    for (const path of s.pick ?? []) {
      const p = byPath.get(clean(path));
      if (p && !list.includes(p)) list.push(p);
      else if (!p) missing.push(path);
    }
    const items = list.slice(0, count);
    const out: ChildPagesSelection<P> = { items, matched: list.length, missing };
    if (!items.length)
      out.reason = s.pick?.length
        ? "The picked pages are switched off or gone: pick others."
        : "No pages are picked yet: add some under Pages.";
    return out;
  }
  const under = clean(s.under || here);
  const prefix = under === "/" ? "/" : `${under}/`;
  const list = pages.filter((p) => {
    const path = clean(p.path);
    if (path === under || !path.startsWith(prefix)) return false;
    return s.depth === "all" || !path.slice(prefix.length).includes("/");
  });
  list.sort((a, b) =>
    s.order === "path" ? clean(a.path).localeCompare(clean(b.path)) : a.title.localeCompare(b.title) || a.path.localeCompare(b.path),
  );
  const items = list.slice(0, count);
  const out: ChildPagesSelection<P> = { items, matched: list.length, missing: [], under };
  if (!items.length)
    out.reason = byPath.has(under)
      ? `No pages are under ${under} yet: add one there, or pick another page.`
      : `There's no page at ${under}: pick another address.`;
  return out;
}

/** What a Child pages section shows, in a sentence for the editor. */
export function summariseChildPages(s: ChildPagesSettings, sel: ChildPagesSelection): { text: string; empty?: string; missing: string[] } {
  if (!sel.items.length) return { text: "Shows no pages.", empty: sel.reason, missing: sel.missing };
  const n = sel.items.length;
  const count = n === sel.matched ? (n === 1 ? "the only page" : `all ${n} pages`) : `${n} of ${sel.matched} pages`;
  if (s.show === "picked")
    return { text: `Shows ${n === 1 ? "1 picked page" : `${n} picked pages`}, in the order picked.`, missing: sel.missing };
  const order = s.order === "path" ? "by address" : "A to Z";
  const where = s.depth === "all" ? `under ${sel.under}` : `directly under ${sel.under}`;
  return { text: `Shows ${count} ${where}, ${order}. Pages added there later join by themselves.`, missing: [] };
}
