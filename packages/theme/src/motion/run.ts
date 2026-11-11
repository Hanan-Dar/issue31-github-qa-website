// Which motion to start (the site's look.motion, on <html data-motion>). Calm is CSS only
// (global.css: sections fade in as they scroll into view). Lively and wow load their code only
// when they're asked for, and nothing moves for anyone who asked their device for less motion.
const html = document.documentElement;
// ?motion= shows a page at another level (the customer's link compares them on the same page).
const asked = new URLSearchParams(location.search).get("motion");
if (asked === "calm" || asked === "lively" || asked === "wow") html.dataset.motion = asked;
const level = html.dataset.motion ?? "calm";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduced && (level === "lively" || level === "wow")) {
  html.classList.add("motion-js");
  void import("./lively").then((m) => m.start());
  if (level === "wow") void import("./wow").then((m) => m.start());
}
