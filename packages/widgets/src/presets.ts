// Presets (plan/ux/widgets.md, "Presets"): a widget's settings under a name, shown in the editor as
// a picture drawn with the site's own content. A preset sets how a section looks and how many items
// it shows; what it shows (the source: tags, picked posts, order) and its words (title, eyebrow,
// lead, anchor, background) stay the section's own.
//
// The theme says which presets its blocks have, in the block's schema meta (`presets`), from the
// ones here or its own: `presetsFor(POSTS_PRESETS, POST_LAYOUTS)`, then add or leave out what it
// likes. `pnpm schema` writes them into blocks.schema.json, which is all editors read.

/** A named set of a widget's settings. */
export interface Preset {
  /** Stable, for the editor's own use ("magazine"). */
  id: string;
  /** What people read ("Magazine"). */
  name: string;
  /** A short line under the name. */
  description: string;
  /** The settings it sets; any it leaves out are their defaults. */
  settings: Record<string, unknown>;
}

/** The Posts widget's presets. The first is the default look (today's Latest posts). */
export const POSTS_PRESETS: readonly Preset[] = [
  {
    id: "three-cards",
    name: "Three cards",
    description: "The newest three as cards.",
    settings: { layout: "grid", count: 3 },
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "One large, four beside it.",
    settings: { layout: "featured", count: 5 },
  },
  {
    id: "headlines",
    name: "Headlines",
    description: "A compact list of titles and dates.",
    settings: { layout: "compact", count: 6 },
  },
  {
    id: "carousel",
    name: "Sliding cards",
    description: "Cards that slide sideways, a few at a time.",
    settings: { layout: "carousel", count: 6 },
  },
  {
    id: "tiles",
    name: "Picture tiles",
    description: "Titles over the pictures, two a row.",
    settings: { layout: "tiles", count: 4, columns: { desktop: 2 } },
  },
];

/** The Gallery widget's presets. The first is the default look. */
export const GALLERY_PRESETS: readonly Preset[] = [
  {
    id: "grid",
    name: "Grid",
    description: "Square pictures in rows; each opens large.",
    settings: { layout: "grid" },
  },
  {
    id: "masonry",
    name: "Masonry",
    description: "Pictures as they are, in columns.",
    settings: { layout: "masonry" },
  },
  {
    id: "slider",
    name: "Slider",
    description: "One wide picture at a time, with arrows.",
    settings: { layout: "carousel", carouselView: { desktop: 1 }, shape: "wide", carouselPeek: false },
  },
];

/** The Testimonials widget's presets. The first is the default look (the reviews as before widgets). */
export const TESTIMONIALS_PRESETS: readonly Preset[] = [
  {
    id: "cards",
    name: "Cards",
    description: "Reviews as cards, three a row.",
    settings: { layout: "grid" },
  },
  {
    id: "carousel",
    name: "Sliding cards",
    description: "Reviews that slide sideways, one or a few at a time.",
    settings: { layout: "carousel" },
  },
  {
    id: "quote",
    name: "One large quote",
    description: "One review, large, in the middle.",
    settings: { layout: "quote" },
  },
];

/** The Team widget's presets. The first is the default look (the people as before widgets). */
export const TEAM_PRESETS: readonly Preset[] = [
  { id: "cards", name: "Cards", description: "Each person on a card, three a row.", settings: { layout: "grid" } },
  {
    id: "portraits",
    name: "Portraits",
    description: "Tall photos, four a row, no cards.",
    settings: { layout: "grid", photoShape: "portrait", cardStyle: "plain", columns: { desktop: 4 } },
  },
  { id: "carousel", name: "Sliding cards", description: "People that slide sideways, a few at a time.", settings: { layout: "carousel" } },
  { id: "list", name: "List", description: "One under another, photo beside the words.", settings: { layout: "list" } },
];

/** The FAQ widget's presets. The first is the default look (as before widgets). */
export const FAQ_PRESETS: readonly Preset[] = [
  {
    id: "accordion",
    name: "Questions that open",
    description: "Each answer shows when its question is clicked or tapped.",
    settings: { layout: "accordion" },
  },
  {
    id: "first-open",
    name: "First answer showing",
    description: "Questions that open, with the first answer already open.",
    settings: { layout: "accordion", open: "first" },
  },
  { id: "columns", name: "Two columns", description: "Every answer showing, in two columns.", settings: { layout: "columns" } },
  { id: "list", name: "List", description: "Every answer showing, one under another.", settings: { layout: "list" } },
];

/** The Logos widget's presets. The first is the default look. */
export const LOGOS_PRESETS: readonly Preset[] = [
  { id: "row", name: "Row", description: "Logos in a centred row.", settings: { layout: "row" } },
  { id: "grey-row", name: "Grey row", description: "In grey until pointed at.", settings: { layout: "row", grey: true } },
  { id: "grid", name: "Grid", description: "Logos on cards, five a row.", settings: { layout: "grid", boxed: true } },
  { id: "strip", name: "Scrolling strip", description: "A slow strip, with a pause button.", settings: { layout: "strip", grey: true } },
];

/** The Child pages widget's presets. The first is the default look. */
export const CHILD_PAGES_PRESETS: readonly Preset[] = [
  { id: "cards", name: "Cards", description: "Each page on a card, three a row.", settings: { layout: "grid" } },
  {
    id: "text-cards",
    name: "Text cards",
    description: "Cards without pictures.",
    settings: { layout: "grid", pictures: false },
  },
  { id: "list", name: "List", description: "One under another.", settings: { layout: "list" } },
  { id: "carousel", name: "Sliding cards", description: "Cards that slide sideways, a few at a time.", settings: { layout: "carousel" } },
];

/** The Pricing widget's presets (a look: the plans and their prices stay). */
export const PRICING_PRESETS: readonly Preset[] = [
  { id: "cards", name: "Cards", description: "Plans on raised cards.", settings: { cardStyle: "raised" } },
  {
    id: "outlined",
    name: "Outlined",
    description: "Plans in outlines, words centred.",
    settings: { cardStyle: "bordered", align: "center" },
  },
];

/** The Before and after widget's presets. */
export const COMPARE_PRESETS: readonly Preset[] = [
  { id: "halfway", name: "Halfway", description: "The handle in the middle.", settings: { start: 50 } },
  { id: "wide", name: "Wide", description: "16:9, the section's full width.", settings: { start: 50, shape: "wide", width: "wide" } },
  { id: "before-first", name: "Before first", description: "Mostly the before picture, to drag across.", settings: { start: 80 } },
];

/** The Posts widget in a widget area (a footer column, a post's sidebar): titles and dates. */
export const RECENT_POSTS_PRESETS: readonly Preset[] = [
  {
    id: "recent",
    name: "Recent posts",
    description: "The newest five: titles and dates.",
    settings: { layout: "compact", count: 5, titleSize: "s" },
  },
  {
    id: "headlines",
    name: "Headlines",
    description: "A compact list of titles and dates.",
    settings: { layout: "compact", count: 6 },
  },
];

/** The Tag list widget's presets. */
export const TAG_LIST_PRESETS: readonly Preset[] = [
  { id: "cloud", name: "Cloud", description: "Tags with more posts larger.", settings: { style: "cloud", counts: false } },
  { id: "list", name: "List", description: "One tag a line, with how many posts.", settings: { style: "list", counts: true } },
];

/** The Archive widget's presets. */
export const ARCHIVE_PRESETS: readonly Preset[] = [
  { id: "years", name: "By year", description: "Each year, with how many posts.", settings: { by: "year", max: 10, counts: true } },
  { id: "months", name: "By month", description: "The last twelve months with posts.", settings: { by: "month", max: 12, counts: true } },
];

/** The Business details widget's presets. */
export const BUSINESS_PRESETS: readonly Preset[] = [
  {
    id: "contact",
    name: "How to reach us",
    description: "The address, phone and email.",
    settings: { parts: ["address", "phone", "email"], icons: true },
  },
  { id: "hours", name: "Opening hours", description: "The week's hours.", settings: { parts: ["hours"], hours: "grouped" } },
  {
    id: "everything",
    name: "Everything",
    description: "Name, address, phone, email and hours.",
    settings: { parts: ["name", "address", "phone", "email", "hours"], icons: true },
  },
];

/** The Social links widget's presets. */
export const SOCIAL_PRESETS: readonly Preset[] = [
  { id: "icons", name: "Icons", description: "A row of icons.", settings: { style: "icons", size: "m" } },
  { id: "names", name: "Icons and names", description: "One a line, icon and name.", settings: { style: "both", size: "s" } },
];

/** The presets a theme can draw: those whose layout it offers. */
export function presetsFor(presets: readonly Preset[], layouts: readonly string[]): Preset[] {
  return presets.filter((p) => typeof p.settings.layout !== "string" || layouts.includes(p.settings.layout));
}

const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

/**
 * The settings a preset decides: every one of `look` (the block's look fields, with their defaults)
 * and any a preset names (How many). Anything else is the section's own.
 */
export function presetFields(presets: readonly Preset[], look: Record<string, unknown>, defaults: Record<string, unknown>) {
  const keys = new Set([...Object.keys(look), ...presets.flatMap((p) => Object.keys(p.settings))]);
  return Object.fromEntries([...keys].map((k) => [k, defaults[k]]));
}

export interface PresetMatch {
  /** The preset the settings are, exactly. */
  exact?: Preset;
  /** Otherwise the nearest (the fewest settings changed, the same layout first): "Based on Magazine". */
  nearest?: Preset;
  /** The settings that differ from `nearest`. */
  changed: string[];
}

/**
 * Which preset a section's settings are, or are nearest to. `fields`: the settings presets decide,
 * each with its default (presetFields); a setting left out is its default.
 */
export function matchPreset(presets: readonly Preset[], value: Record<string, unknown>, fields: Record<string, unknown>): PresetMatch {
  const now = (k: string) => value[k] ?? fields[k];
  let best: { p: Preset; changed: string[]; layout: boolean } | undefined;
  for (const p of presets) {
    const changed = Object.keys(fields).filter((k) => !same(now(k), p.settings[k] ?? fields[k]));
    if (!changed.length) return { exact: p, nearest: p, changed: [] };
    const layout = !changed.includes("layout");
    if (!best || Number(layout) > Number(best.layout) || (layout === best.layout && changed.length < best.changed.length))
      best = { p, changed, layout };
  }
  return best ? { nearest: best.p, changed: best.changed } : { changed: [] };
}

/** A section with a preset's settings: the ones presets decide replaced, the rest (words, source) kept. */
export function applyPreset<T extends Record<string, unknown>>(value: T, preset: Preset, fields: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...value };
  for (const k of Object.keys(fields)) delete out[k];
  return { ...out, ...structuredClone(preset.settings) } as T;
}
