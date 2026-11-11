// Reads the content collections for routes, menus and blocks.
import { type CollectionEntry, getCollection } from "astro:content";
import site from "virtual:site/config";
import { pageOn } from "../site-config";
import { mdText } from "./md";

/** "services/boilers" → "/services/boilers", "index" → "/" */
export const pagePath = (id: string) => (id === "index" ? "/" : `/${id}`);

/** Pages that are built (not switched off in site.config.ts). */
export const publishedPages = () => getCollection("pages", (p) => pageOn(site, p.id));

/** Blog posts, newest first; none when the site has no blog. */
export async function publishedPosts(): Promise<CollectionEntry<"blog">[]> {
  if (!site.blog) return [];
  const posts = await getCollection("blog", (p) => !p.data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title));
}

export const postPath = (slug: string) => `/${site.blog?.path}/${slug}`;

/**
 * Is this link's target built? Menus and link cards drop links to pages that are switched off,
 * so turning a page off in site.config.ts never leaves a broken link behind.
 */
export function linkOn(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return true;
  const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (site.blog && (path === `/${site.blog.path}` || path.startsWith(`/${site.blog.path}/`))) return true;
  return pageOn(site, path === "/" ? "index" : path.slice(1));
}

type Block = CollectionEntry<"pages">["data"]["blocks"][number];

/**
 * Link cards take their title and text from the page they point at (its hero's lead), so a card
 * never goes stale. Text given in the page file wins. Cards for switched-off pages are dropped.
 */
export async function resolveLinks(blocks: Block[]): Promise<Block[]> {
  if (!blocks.some((b) => b.blockType === "links")) return blocks;
  const pages = new Map((await publishedPages()).map((p) => [pagePath(p.id), p.data]));
  return blocks.map((block) => {
    if (block.blockType !== "links") return block;
    const items = block.items.filter((item) => linkOn(item.href)).map((item) => {
      const page = pages.get(item.href);
      if (!page) {
        if (item.title) return item;
        throw new Error(`A links card points at ${item.href}, which is not a page on this site, and has no title`);
      }
      const hero = page.blocks.find((b) => b.blockType === "hero");
      return { ...item, title: item.title ?? page.title, text: item.text ?? (hero?.blockType === "hero" ? mdText(hero.lead) : page.seo.description) };
    });
    return { ...block, items };
  });
}
