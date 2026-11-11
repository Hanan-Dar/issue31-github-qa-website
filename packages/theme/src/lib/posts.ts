// The blog's tags and pages, and the posts each Posts section on a page shows (chosen by Craeft's
// widgets, packages/widgets; drawn by blocks/posts/).
import { getCollection, getEntry } from "astro:content";
import { monthKey } from "@craeft/widgets/archive";
import { selectPage, tagSlug, tagsOf } from "@craeft/widgets/posts";
import site from "virtual:site/config";
import type { PageBlock } from "../blocks/schema";
import { publishedPosts } from "./content";

/** Posts per page on a tag's pages. */
export const PAGE_SIZE = 12;

/**
 * Posts per page on the blog's index: site.config.ts `blog.perPage`. Without it the index lists
 * every post on one page, as it always has (paging is the site's choice; new sites set 12).
 */
export const BLOG_PAGE_SIZE: number | undefined = site.blog?.perPage;

const blogPath = () => `/${site.blog?.path}`;

/** The blog's index, page `n`: /<blog>, /<blog>/page/2, … */
export const blogPagePath = (n: number) => (n <= 1 ? blogPath() : `${blogPath()}/page/${n}`);

/** A tag's page `n`: /<blog>/tag/<slug>, /<blog>/tag/<slug>/2, … */
export const tagPath = (tag: string, n = 1) => `${blogPath()}/tag/${tagSlug(tag)}${n > 1 ? `/${n}` : ""}`;

/**
 * A year's page, /<blog>/year/<year> (`/year/` so a post's own address can never collide, as
 * `/page/` and `/tag/`), or a month's place on it (#2026-03).
 */
export const yearPath = (year: number, month?: number) => `${blogPath()}/year/${year}${month ? `#${monthKey(year, month)}` : ""}`;

/**
 * Whether any page, saved section or widget area has an Archive: the year pages are built only then
 * (they come and go with it, so a site without one builds exactly as before).
 */
export async function usesArchive(): Promise<boolean> {
  if (!site.blog) return false;
  const has = (blocks: readonly { blockType?: string }[] | undefined) => (blocks ?? []).some((b) => b.blockType === "archive");
  const [pages, sections, areas] = await Promise.all([getCollection("pages"), getCollection("sections"), getCollection("widget-areas")]);
  return pages.some((p) => has(p.data.blocks)) || sections.some((s) => has([s.data.block])) || areas.some((a) => has(a.data.blocks));
}

/** A tag with fewer posts than this has a page, but it's noindex and left out of the sitemap. */
export const MIN_INDEXED = 2;

/** The site's tags (published posts only), most used first. */
export const blogTags = async () => tagsOf(await publishedPosts());

/** How many pages a list of `count` posts takes, `size` a page (at least one; no size: one page). */
export const pageCount = (count: number, size: number | undefined) => (size ? Math.max(1, Math.ceil(count / size)) : 1);

/** Saved sections in their place: a missing one fails the build (a page never loses a section). */
export async function expandSaved<B extends PageBlock | undefined>(blocks: B[]) {
  return Promise.all(
    blocks.map(async (b) => {
      if (b?.blockType !== "saved") return b as Exclude<B, { blockType: "saved" }>;
      const saved = await getEntry("sections", b.id);
      if (!saved) throw new Error(`The saved section "${b.id}" isn't in src/content/sections/.`);
      return saved.data.block;
    }),
  );
}

/** The commit this build is of (Workers Builds), if known: shuffled sections start from it. */
const COMMIT = process.env.WORKERS_CI_COMMIT_SHA;

/**
 * What each Posts section on a page shows, by block index (saved sections already expanded). The
 * whole page at once: "Not already shown on this page" needs what's above. Shuffles start from the
 * commit and the page's address, so Edit (which sends both) and the built site agree.
 */
export async function postSelections(
  blocks: readonly ({ blockType: string } | undefined)[],
  page: { path?: string; commit?: string; current?: string } = {},
) {
  if (!blocks.some((b) => b?.blockType === "posts")) return [];
  return selectPage(blocks, await publishedPosts(), { seed: pageSeed(page), current: page.current });
}

/** Where a page's shuffles start: the commit and the page's address (Edit sends both). */
export const pageSeed = (page: { path?: string; commit?: string } = {}) => `${page.commit ?? COMMIT ?? ""}:${page.path ?? ""}`;
export type PostSelection = NonNullable<Awaited<ReturnType<typeof postSelections>>[number]>;
