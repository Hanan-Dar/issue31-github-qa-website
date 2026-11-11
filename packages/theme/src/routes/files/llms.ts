// /llms.txt: a plain-text map of the site for AI assistants, made from the content so new pages
// and posts appear by themselves.
import type { APIRoute } from "astro";
import site from "virtual:site/config";
import { pagePath, postPath, publishedPages, publishedPosts } from "../../lib/content";
import { addressLine } from "../../lib/format";

export const GET: APIRoute = async () => {
  const pages = (await publishedPages()).filter((p) => p.id !== "index").sort((a, b) => a.id.localeCompare(b.id));
  const posts = await publishedPosts();
  const url = (p: string) => site.origin + p;
  const contact = [`Email: ${site.contact.email}`, site.contact.phone && `Phone: ${site.contact.phone}`, addressLine() && `Address: ${addressLine()}`]
    .filter(Boolean)
    .join(". ");
  const body = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${contact}.`,
    ...(site.areasServed.length ? ["", `Areas covered: ${site.areasServed.join(", ")}.`] : []),
    "",
    "## Pages",
    "",
    `- [Home](${url("/")})`,
    ...pages.map((p) => `- [${p.data.title}](${url(pagePath(p.id))}): ${p.data.seo.description}`),
    ...(site.blog && posts.length ? ["", `## ${site.blog.title}`, "", ...posts.map((p) => `- [${p.data.title}](${url(postPath(p.id))}): ${p.data.description}`)] : []),
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
