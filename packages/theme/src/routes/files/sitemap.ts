// /sitemap.xml: every page and post that's built and indexable, with when it last changed. The
// blog's later pages and its tags' pages too, except tags with fewer than MIN_INDEXED posts (noindex).
import type { APIRoute } from "astro";
import { postYears } from "@craeft/widgets/archive";
import { tagSlug } from "@craeft/widgets/posts";
import site from "virtual:site/config";
import { pagePath, postPath, publishedPages, publishedPosts } from "../../lib/content";
import { BLOG_PAGE_SIZE, blogPagePath, blogTags, MIN_INDEXED, PAGE_SIZE, pageCount, tagPath, usesArchive, yearPath } from "../../lib/posts";

export const GET: APIRoute = async () => {
  const pages = (await publishedPages()).map((p) => ({ path: pagePath(p.id), lastmod: p.data.updatedAt }));
  const posts = (await publishedPosts()).map((p) => ({ path: postPath(p.id), lastmod: p.data.updated ?? p.data.date }));
  const blog = site.blog ? [{ path: `/${site.blog.path}`, lastmod: posts[0]?.lastmod }] : [];
  // A list's page n changed when its newest post did.
  const paged = (list: { lastmod: Date }[], path: (n: number) => string, from: number, size: number | undefined) =>
    size ? Array.from({ length: Math.max(0, pageCount(list.length, size) - from + 1) }, (_, i) => ({ path: path(i + from), lastmod: list[(i + from - 1) * size]?.lastmod })) : [];
  const more = site.blog ? paged(posts, blogPagePath, 2, BLOG_PAGE_SIZE) : [];
  const all = await publishedPosts();
  const tags = (await blogTags())
    .filter((t) => t.count >= MIN_INDEXED)
    .flatMap((t) => {
      const tagged = all.filter((p) => (p.data.tags ?? []).some((x) => tagSlug(x) === t.slug)).map((p) => ({ lastmod: p.data.updated ?? p.data.date }));
      return paged(tagged, (n) => tagPath(t.name, n), 1, PAGE_SIZE);
    });
  // A year's page (while an Archive links to them) changed when its newest post did.
  const years = (await usesArchive())
    ? postYears(all)
        .filter((y) => y.count >= MIN_INDEXED)
        .map((y) => ({ path: yearPath(y.year), lastmod: all.find((p) => p.data.date.getUTCFullYear() === y.year)?.data.date }))
    : [];
  const urls = [...pages, ...blog, ...more, ...tags, ...years, ...posts].sort((a, b) => a.path.localeCompare(b.path));
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => ["  <url>", `    <loc>${site.origin}${u.path === "/" ? "/" : encodeURI(u.path)}</loc>`, ...(u.lastmod ? [`    <lastmod>${u.lastmod.toISOString()}</lastmod>`] : []), "  </url>"].join("\n"))
  .join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
