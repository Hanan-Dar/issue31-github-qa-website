// Links a visitor can follow, for every widget's link field (a logo's, a picture's, a plan's
// button, a person's website): a page on this site, a #section, or an http(s), mailto: or tel:
// address. Never javascript:, data: or vbscript:, which run code or carry a page of their own.

/** Case-insensitive without a flag (JSON Schema's `pattern` has none): "tel" → "[tT][eE][lL]". */
const ci = (word: string) => word.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`);

/**
 * A safe link: "/contact" (not "//elsewhere" or "/\elsewhere", which browsers read as another site),
 * "#prices", "https://…", "http://…", "mailto:…", "tel:…". A JSON Schema `pattern` too.
 */
export const SAFE_LINK = new RegExp(`^(?:/(?![/\\\\])|#|${ci("http")}${ci("s")}?://|${ci("mailto")}:|${ci("tel")}:)`);

/** A web address only (a person's website, a profile): http:// or https://. */
export const WEB_LINK = new RegExp(`^${ci("http")}${ci("s")}?://.`);

/** What a refused link's message says. */
export const SAFE_LINK_MESSAGE = "A page on this site (/contact), a #section, or a full address (https://…, mailto:…, tel:…)";

/** Whether `href` is a link a widget may draw (SAFE_LINK). */
export const isSafeLink = (href: unknown): href is string => typeof href === "string" && SAFE_LINK.test(href);

/**
 * Whether `href` would run code or open a page made of itself when followed: javascript:, data: or
 * vbscript:, as a browser reads it (spaces and control characters before it, tabs and line breaks
 * inside it, any case). Older fields (a Button's link) refuse only these, so every value they took
 * before still works.
 */
export function scriptLink(href: string): boolean {
  // What a browser drops first: spaces and control characters before it (U+0000 to U+0020), then
  // every tab and line break.
  let from = 0;
  while (from < href.length && href.charCodeAt(from) <= 0x20) from++;
  const s = href
    .slice(from)
    .replace(/[\t\n\r]/g, "")
    .toLowerCase();
  return /^(?:javascript|data|vbscript):/.test(s);
}
