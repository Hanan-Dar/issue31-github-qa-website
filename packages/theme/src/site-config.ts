// The site's facts and settings, in one typed object (sites/main/site.config.ts). The site passes it
// to the `siteTheme()` integration; pages and components read it from `virtual:site/config`.
// Nothing here is secret: it's built into the public pages.

/** Fonts the theme ships (self-hosted, so the CSP can keep fonts to 'self'). */
export const FONTS = {
  Inter: { family: "Inter Variable", pkg: "@fontsource-variable/inter", fallback: "sans" },
  "DM Sans": { family: "DM Sans Variable", pkg: "@fontsource-variable/dm-sans", fallback: "sans" },
  Manrope: { family: "Manrope Variable", pkg: "@fontsource-variable/manrope", fallback: "sans" },
  Outfit: { family: "Outfit Variable", pkg: "@fontsource-variable/outfit", fallback: "sans" },
  Fraunces: { family: "Fraunces Variable", pkg: "@fontsource-variable/fraunces", fallback: "serif" },
  Lora: { family: "Lora Variable", pkg: "@fontsource-variable/lora", fallback: "serif" },
  "Source Serif 4": { family: "Source Serif 4 Variable", pkg: "@fontsource-variable/source-serif-4", fallback: "serif" },
  System: { family: "", pkg: "", fallback: "sans" },
} as const;
export type FontName = keyof typeof FONTS;

/**
 * The site's layout, shape and type (Craeft's Site styles, roadmap 17.7 and 17.8): every choice
 * optional, the theme's own look when left out. LOOK lists the choices (schema.ts's SiteStyle uses the same lists).
 */
export const LOOK = {
  /** The whole design (phase 22's looks): the hero, type and section style. */
  design: ["friendly", "premium", "bold", "minimal"],
  /** How much it moves: CSS reveals only; entrances and smooth scrolling; a 3D hero and cursor effects. */
  motion: ["calm", "lively", "wow"],
  header: ["classic", "centred", "minimal"],
  footer: ["columns", "simple"],
  corners: ["square", "soft", "round"],
  shadows: ["none", "soft", "strong"],
  spacing: ["compact", "normal", "airy"],
  buttons: ["filled", "outline"],
  headingSize: ["smaller", "normal", "larger"],
  headingWeight: ["regular", "semibold", "bold"],
  eyebrowCase: ["capitals", "as-written"],
} as const;
type Pick1<K extends keyof typeof LOOK> = (typeof LOOK)[K][number];
export interface Look {
  design?: Pick1<"design">;
  motion?: Pick1<"motion">;
  header?: Pick1<"header">;
  footer?: Pick1<"footer">;
  corners?: Pick1<"corners">;
  shadows?: Pick1<"shadows">;
  spacing?: Pick1<"spacing">;
  buttons?: Pick1<"buttons">;
  headingSize?: Pick1<"headingSize">;
  headingWeight?: Pick1<"headingWeight">;
  /** The short line above titles: in capitals or as written, and a Lucide icon before it. */
  eyebrow?: { case?: Pick1<"eyebrowCase">; icon?: string };
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Day = (typeof DAYS)[number];

export interface SiteConfig {
  /** Where the site lives: https, no trailing slash (a workers.dev address until the domain is connected). */
  origin: string;
  /** BCP 47 language tag for <html lang>, dates and JSON-LD. */
  locale: "en-GB" | "en-IE" | "en-US" | "en-AU" | "en-NZ" | "en-CA";
  /** The name people know the business by; used in titles ("{page} | {name}"). */
  name: string;
  /** The registered name, if it differs (shown in the footer). */
  legalName?: string;
  /** One or two sentences: what the business does and for whom (home page, JSON-LD, llms.txt). */
  description: string;
  /** schema.org type for structured data, e.g. "Plumber", "AccountingService", "Restaurant". */
  businessType: string;
  contact: {
    email: string;
    /** As people dial it, e.g. "0113 496 0000". */
    phone?: string;
  };
  address?: {
    street?: string;
    locality: string;
    region?: string;
    postalCode?: string;
    /** ISO 3166-1 alpha-2, e.g. "GB". */
    country: string;
  };
  /** Towns or areas the business covers. */
  areasServed: string[];
  /** Days not listed are shown as closed. Times are 24-hour "HH:MM". */
  openingHours: { day: Day; opens: string; closes: string }[];
  /** A Google Maps (or similar) link for "Get directions". */
  mapUrl?: string;
  /** Hex colours; the theme works out readable text colours and tints from them. */
  colours: { primary: string; accent: string };
  fonts: { heading: FontName; body: FontName };
  /** Corners, shadows, spacing, buttons, headings and eyebrows (sites/main/src/data/style.json). */
  look?: Look;
  /** Path under public/, e.g. "/media/logo.svg". */
  logo: string;
  /** Default social share image (PNG or JPG under public/), for pages without their own. */
  shareImage?: string;
  /** Social profile URLs (footer and JSON-LD sameAs). */
  social: string[];
  /**
   * Pages switched off: `false` keeps the file but doesn't build the page (it leaves the menus and
   * the sitemap). Remove its line from url-contract.json, or redirect it in redirects.ts, too.
   */
  pages: Record<string, boolean>;
  /**
   * The blog (posts in src/content/blog), at /<path>; leave out for no blog. `perPage`: posts on each
   * page of its index (then /<path>/page/2 …); left out, the index lists every post on one page.
   */
  blog?: { path: string; title: string; description: string; perPage?: number };
  forms: {
    /** Where enquiries are sent. The backend's FORM_INBOX var (backend/wrangler.jsonc) must match. */
    inbox: string;
    /** Cloudflare Turnstile site key (public). Without it the form shows the email address instead. */
    turnstileSiteKey?: string;
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function defineSite(config: SiteConfig): SiteConfig {
  const fail = (m: string) => {
    throw new Error(`site.config.ts: ${m}`);
  };
  if (!/^https:\/\/[^/]+$/.test(config.origin)) fail(`origin must be https://<host> without a trailing slash, got ${config.origin}`);
  for (const [k, v] of Object.entries(config.colours)) if (!HEX.test(v)) fail(`colours.${k} must be a hex colour like #1d4ed8, got ${v}`);
  for (const [k, v] of Object.entries(config.fonts)) if (!(v in FONTS)) fail(`fonts.${k} must be one of ${Object.keys(FONTS).join(", ")}`);
  const { eyebrow, ...look } = config.look ?? {};
  for (const [k, v] of Object.entries(look))
    if (!(LOOK as Record<string, readonly string[]>)[k]?.includes(v as string)) fail(`look.${k} must be one of ${(LOOK as Record<string, readonly string[]>)[k]?.join(", ") ?? "(no such setting)"}`);
  if (eyebrow?.case && !LOOK.eyebrowCase.includes(eyebrow.case)) fail(`look.eyebrow.case must be one of ${LOOK.eyebrowCase.join(", ")}`);
  if (eyebrow?.icon && !/^[A-Z][A-Za-z0-9]*$/.test(eyebrow.icon)) fail(`look.eyebrow.icon must be a Lucide icon name like Target, got ${eyebrow.icon}`);
  for (const h of config.openingHours) {
    if (!DAYS.includes(h.day)) fail(`openingHours: unknown day ${h.day}`);
    if (!TIME.test(h.opens) || !TIME.test(h.closes)) fail(`openingHours: times must be HH:MM (${h.day})`);
  }
  if (config.blog && !/^[a-z0-9-]+$/.test(config.blog.path)) fail(`blog.path must be lowercase letters, digits and hyphens`);
  const perPage = config.blog?.perPage;
  if (perPage !== undefined && !(Number.isInteger(perPage) && perPage >= 1 && perPage <= 100)) fail(`blog.perPage must be a whole number from 1 to 100, got ${perPage}`);
  if (!config.logo.startsWith("/")) fail("logo must be a path under public/, e.g. /media/logo.svg");
  return config;
}

/** Is this page built? (`index` and `contact` are always on.) */
export const pageOn = (site: SiteConfig, id: string) => id === "index" || id === "contact" || site.pages[id] !== false;

// ── Colours ────────────────────────────────────────────────────────────────────────────────────
// Customers pick any colours, so the theme derives what goes on them: text that stays readable
// (WCAG AA, 4.5:1) on the colour, and a darker "ink" shade of it for text on white.

const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const mix = (hex: string, toward: string, t: number) => {
  const [a, b] = [rgb(hex), rgb(toward)];
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
};
/** The colour moved toward `toward` until it reaches `ratio` against `against`. */
function until(hex: string, toward: string, against: string, ratio: number) {
  for (let t = 0; t <= 1; t += 0.02) {
    const c = mix(hex, toward, t);
    if (contrast(c, against) >= ratio) return c;
  }
  return toward;
}

const INK = "#111418";
const WHITE = "#ffffff";

/** CSS custom properties for the site's shape and type (global.css falls back to the theme's own look). */
export function lookVars(look: Look = {}): Record<string, string> {
  const v: Record<string, string> = {};
  const corners = { square: ["0.25rem", "0.25rem", "0.25rem"], soft: ["0.6rem", "0.6rem", "0.5rem"], round: [] }[look.corners ?? "round"];
  if (corners.length) [v["--look-radius-card"], v["--look-radius-btn"], v["--look-radius-tile"]] = corners;
  if (look.shadows === "none") v["--look-shadow-card"] = "none";
  if (look.shadows === "strong") v["--look-shadow-card"] = "0 2px 4px rgb(16 24 40 / 0.06), 0 18px 40px -16px rgb(16 24 40 / 0.28)";
  if (look.spacing === "compact") [v["--look-section-y"], v["--look-section-y-lg"]] = ["3rem", "4rem"];
  if (look.spacing === "airy") [v["--look-section-y"], v["--look-section-y-lg"]] = ["5.5rem", "8rem"];
  if (look.buttons === "outline") {
    v["--look-btn-bg"] = "transparent";
    v["--look-btn-fg"] = "var(--brand-primary-ink)";
    v["--look-btn-border"] = "var(--brand-primary-ink)";
  }
  if (look.headingSize === "smaller") v["--look-heading-scale"] = "0.88";
  if (look.headingSize === "larger") v["--look-heading-scale"] = "1.12";
  if (look.headingWeight === "regular") v["--look-heading-weight"] = "400";
  if (look.headingWeight === "bold") v["--look-heading-weight"] = "700";
  if (look.eyebrow?.case === "as-written") [v["--look-eyebrow-case"], v["--look-eyebrow-spacing"]] = ["none", "0"];
  return v;
}

/** CSS custom properties for the site's colours (written into :root by the integration). */
export function colourVars(colours: SiteConfig["colours"]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, hex] of Object.entries(colours)) {
    const onWhite = contrast(hex, WHITE) >= 4.5;
    // Text on the colour: white if it's readable, else near-black; if neither is (mid tones), the
    // fill itself is darkened until white text is readable on it.
    const fill = onWhite || contrast(hex, INK) >= 4.5 ? hex : until(hex, INK, WHITE, 4.5);
    vars[`--brand-${name}`] = fill;
    vars[`--brand-on-${name}`] = contrast(fill, WHITE) >= 4.5 ? WHITE : INK;
    // For text and links on white and on the light tint (which is 8% of the colour).
    vars[`--brand-${name}-ink`] = until(hex, INK, mix(hex, WHITE, 0.92), 4.8);
  }
  // Dark bands (footer, call to action): the primary colour deepened until white text is easy to read.
  vars["--brand-dark"] = until(colours.primary, INK, WHITE, 10);
  return vars;
}
