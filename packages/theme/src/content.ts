// Content collections. The site re-exports `collections` from its src/content.config.ts, so the
// folders below are the site's own src/content/.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { AlbumData, AreaData, FaqData, LogoData, PageData, PostData, SavedSection, SitePresetsData, TeamMemberData, TestimonialData } from "./blocks/schema";

/**
 * Pages: src/content/pages/<path>.yaml → /<path> (index.yaml → /). A page is its title, its
 * search-engine text and an ordered list of blocks (blocks/schema.ts).
 */
const pages = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/pages" }),
  schema: PageData,
});

/** Blog posts: src/content/blog/<slug>.md → /<blog path>/<slug> (site.config.ts `blog`). */
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: PostData.refine((p) => !p.image || p.imageAlt, { message: "imageAlt is required when image is set", path: ["imageAlt"] }),
});

/** Saved sections: src/content/sections/<id>.yaml, used on pages as { blockType: saved, id }. */
const sections = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/sections" }),
  schema: SavedSection,
});

/** Albums: src/content/albums/<id>.yaml, shown by Gallery sections. */
const albums = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/albums" }),
  schema: AlbumData,
});

/** Testimonials: src/content/testimonials/<id>.yaml, shown by Reviews sections. */
const testimonials = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/testimonials" }),
  schema: TestimonialData,
});

/** The team: src/content/team/<id>.yaml, shown by Team sections. */
const team = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/team" }),
  schema: TeamMemberData,
});

/** Questions and answers: src/content/faq/<id>.yaml, shown by FAQ sections. */
const faq = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/faq" }),
  schema: FaqData,
});

/** Logos: src/content/logos/<id>.yaml, shown by Logos sections. */
const logos = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/logos" }),
  schema: LogoData,
});

/**
 * Widget areas: src/content/widget-areas/<area>.yaml (blocks/schema.ts AREAS: footer, post-sidebar),
 * the widgets each place beyond a page's own sections shows. Without a file, nothing changes.
 */
const widgetAreas = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/widget-areas" }),
  schema: AreaData,
});

/** A widget's presets saved in Craeft's Edit: src/content/presets/<blockType>.yaml (the editor reads them). */
const presets = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/presets" }),
  schema: SitePresetsData,
});

export const collections = { pages, blog, sections, albums, testimonials, team, faq, logos, "widget-areas": widgetAreas, presets };
