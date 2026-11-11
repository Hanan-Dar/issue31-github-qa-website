// /rss.xml: the blog as an RSS 2.0 feed.
import type { APIRoute } from "astro";
import site from "virtual:site/config";
import { postPath, publishedPosts } from "../../lib/content";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async () => {
  const blog = site.blog!;
  const items = (await publishedPosts()).map((p) => {
    const link = site.origin + postPath(p.id);
    return `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${p.data.date.toUTCString()}</pubDate>
      <description>${esc(p.data.description)}</description>
    </item>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${site.name}: ${blog.title}`)}</title>
    <link>${site.origin}/${blog.path}</link>
    <description>${esc(blog.description)}</description>
    <language>${site.locale}</language>
    <atom:link href="${site.origin}/rss.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
