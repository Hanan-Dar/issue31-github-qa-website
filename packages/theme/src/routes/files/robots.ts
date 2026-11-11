// /robots.txt: AI crawlers are named and allowed explicitly (so a blanket block added later is
// easy to spot), everyone else is allowed too, except the form's API; plus the sitemap. A crawler
// obeys only the most specific group naming it, so each group repeats the /api/ rule.
import type { APIRoute } from "astro";
import site from "virtual:site/config";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "Google-Extended",
  "Google-CloudVertexBot",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "meta-externalagent",
  "cohere-ai",
  "DuckAssistBot",
  "MistralAI-User",
];

export const GET: APIRoute = () => {
  const body = [
    "# AI crawlers are welcome: named here so a future blanket block is easy to spot.",
    ...AI_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, "Allow: /", "Disallow: /api/", ""]),
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${site.origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
