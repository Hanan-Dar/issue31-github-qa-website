// Markdown in content: inline (**bold**, [links](/x)) for short fields, full for `body` fields.
// Content can come from outside Craeft's checks (a customer's link, an import, an edit in Git), so
// what it makes is only Markdown's own HTML: raw HTML in it is left out, and a link or picture
// whose address could run code (javascript:, data:, vbscript:…) is shown as its words alone.
import { SAFE_LINK, scriptLink } from "@craeft/widgets/links";
import { Marked } from "marked";

/**
 * Whether a link in Markdown may stay a link: a page on this site, a #section, an http(s), mailto:
 * or tel: address (SAFE_LINK), or a relative address ("contact", "../prices", "?page=2") with no
 * scheme of its own, as a browser reads it (leading spaces and control characters, tabs and line
 * breaks inside it ignored). Marked writes an address's character references as they are, and the
 * browser decodes them ("java&#115;cript:", "javascript&colon;"), so one before the first /, ? or #
 * (where its scheme would be) isn't a link.
 */
export function markdownLink(href: string): boolean {
  if (scriptLink(href)) return false;
  const s = href.replace(/^[\u0000-\u0020]+/, "").replace(/[\t\n\r]/g, "");
  if (s.split(/[/?#]/)[0].includes("&")) return false;
  if (SAFE_LINK.test(s)) return true;
  // "//elsewhere" and "/\elsewhere" go to another site; "name:" is a scheme (only the safe ones above).
  return !/^[/\\]{2}/.test(s) && !/^[a-z][a-z0-9+.-]*:/i.test(s);
}

const md = new Marked({
  async: false,
  renderer: {
    // Raw HTML, a block (<div>…</div>) or inline (<span>, <img onerror>, <script>): left out.
    html: () => "",
    // false: Marked's own rendering; else the link's words, without the link.
    link(token) {
      return markdownLink(token.href) ? false : this.parser.parseInline(token.tokens);
    },
    // A picture in text is lazy: below the top of the page, and its width is the text's, which the
    // browser then measures to pick its smaller copy (srcset.ts gives it sizes="auto, …", issue #34).
    image(token) {
      if (!markdownLink(token.href)) return escapeText(token.text);
      const title = token.title ? ` title="${escapeText(token.title)}"` : "";
      return `<img src="${escapeText(token.href)}" alt="${escapeText(token.text)}"${title} loading="lazy" decoding="async">`;
    },
  },
});

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Inline Markdown to HTML (no surrounding <p>). */
export const mdInline = (s: string) => md.parseInline(s, { async: false });

/** Full Markdown to HTML. */
export const mdBlock = (s: string) => md.parse(s, { async: false });

/** Markdown to plain text (structured data, meta tags). */
export const mdText = (s: string) =>
  s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
