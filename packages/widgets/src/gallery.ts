// The Gallery widget (plan/ux/widgets.md, "Widgets": Gallery): pictures typed in the section, or an
// album (src/content/albums/<id>.yaml), filtered by tag, in order or shuffled; shown as a grid,
// masonry or a carousel, each opening large (the lightbox), as itself, at its link, or not at all.
// Plain data in, data out, so the site's build, Craeft's render Worker and the editor's "Shows 8 of
// 12 pictures" agree. The theme draws what this returns.
import { carouselOptions, type Def, type Layout, layoutOptions, meta, type Opt, type ZodApi } from "./options.ts";
import { countTags, hash, type Selection, type TagCount, tagsMatch, wantedTags } from "./posts.ts";

/** A picture as an album or a section holds it (the theme's schema checks it). */
export interface Picture {
  /** Under /media/. */
  src: string;
  /** What it shows, for people who can't see it. */
  alt: string;
  caption?: string;
  tags?: string[];
  /** Where it leads when "Click opens" is "its link". */
  link?: string;
  /** A YouTube or Vimeo address: the picture stands for the video, which plays in the lightbox. */
  video?: string;
}

/** An album's file: its name and its pictures. */
export interface Album<P extends Picture = Picture> {
  name: string;
  pictures: P[];
}

export const GALLERY_SHOW = ["pictures", "album"] as const;
export const GALLERY_ORDER = ["as-is", "shuffled"] as const;
export const GALLERY_CLICK = ["lightbox", "picture", "link", "none"] as const;
export const CAPTIONS = ["none", "under", "hover"] as const;
export const SHAPES = ["natural", "square", "standard", "wide"] as const;
/** The most pictures a gallery shows. */
export const MAX_PICTURES = 96;

/** A gallery's Source: these pictures, or an album; with which tags; in what order; how many. */
export function gallerySourceOptions(z: ZodApi, picture: unknown) {
  const m = meta("content", "Source");
  return {
    show: z
      .enum(GALLERY_SHOW)
      .default("pictures")
      .meta(
        m({
          title: "Show",
          description:
            "Pictures added here, or one of the site's albums: a set of pictures other sections can show too (Pages and posts lists them).",
          labels: { pictures: "These pictures", album: "An album" },
        }),
      ) as Def<(typeof GALLERY_SHOW)[number]>,
    pictures: z
      .array(picture)
      .max(MAX_PICTURES)
      .optional()
      .meta(
        m({
          title: "Pictures",
          description: "Each with a description; a caption, tags, a link or a video if you like.",
          showWhen: { show: "pictures" },
        }),
      ) as Opt<Picture[]>,
    album: z
      .string()
      .regex(/^[a-z0-9][a-z0-9/_-]*$/)
      .optional()
      .meta(
        m({ title: "Album", description: "One of the site's albums.", showWhen: { show: "album" }, format: "pick-album" }),
      ) as Opt<string>,
    tags: z
      .array(z.string())
      .optional()
      .meta(m({ title: "Only pictures tagged", description: "Left empty, every picture.", format: "picture-tags" })) as Opt<string[]>,
    tagMatch: z
      .enum(["any", "all"])
      .default("any")
      .meta(m({ title: "Tags to match", labels: { any: "Any of them", all: "All of them" }, more: true })) as Def<"any" | "all">,
    order: z
      .enum(GALLERY_ORDER)
      .default("as-is")
      .meta(
        m({
          title: "Order",
          description: "Shuffled changes only when the site changes, so everyone sees the same order.",
          labels: { "as-is": "As they are", shuffled: "Shuffled" },
          more: true,
        }),
      ) as Def<(typeof GALLERY_ORDER)[number]>,
    count: z
      .number()
      .int()
      .min(1)
      .max(MAX_PICTURES)
      .optional()
      .meta(m({ title: "How many", description: "Left empty, all of them.", more: true })) as Opt<number>,
    emptyText: z
      .string()
      .optional()
      .meta(
        m({ title: "When nothing matches", description: "A line shown instead. Left empty, the section isn't shown at all.", more: true }),
      ) as Opt<string>,
  };
}

/** How a gallery's pictures look and what a click on one does. */
export function pictureOptions(z: ZodApi) {
  const m = meta("style", "Pictures");
  return {
    click: z
      .enum(GALLERY_CLICK)
      .default("lightbox")
      .meta(
        m({
          title: "Click opens",
          description: "Large opens it over the page, with arrows to the others. With no script it opens the picture.",
          labels: { lightbox: "Large, over the page", picture: "The picture", link: "Its link", none: "Nothing" },
        }),
      ) as Def<(typeof GALLERY_CLICK)[number]>,
    captions: z
      .enum(CAPTIONS)
      .default("under")
      .meta(m({ title: "Captions", labels: { none: "None", under: "Under the picture", hover: "On hover" } })) as Def<
      (typeof CAPTIONS)[number]
    >,
    shape: z
      .enum(SHAPES)
      .default("square")
      .meta(
        m({
          title: "Shape",
          description: "Pictures are cropped to it. Masonry always shows them as they are.",
          labels: { natural: "As it is", square: "1:1", standard: "4:3", wide: "16:9" },
          showWhen: { layout: ["grid", "carousel"] },
        }),
      ) as Def<(typeof SHAPES)[number]>,
    hover: z
      .enum(["none", "zoom", "darken"])
      .default("zoom")
      .meta(m({ title: "On hover", labels: { none: "None", zoom: "Zoom", darken: "Darken" }, more: true })) as Def<
      "none" | "zoom" | "darken"
    >,
  };
}

/**
 * The Gallery widget's fields, for the theme's block: `z.object({ blockType, ...header, tone,
 * ...gallerySchema(z, { layouts, picture }) })`. `picture`: the theme's schema for one picture.
 */
export function gallerySchema<const L extends Layout>(
  z: ZodApi,
  { layouts, picture }: { layouts: readonly [L, ...L[]]; picture: unknown },
) {
  return {
    ...gallerySourceOptions(z, picture),
    ...layoutOptions(z, layouts, { omit: ["equalHeights"], columns: { desktop: 3, tablet: 3, phone: 2 } }),
    ...carouselOptions(z),
    ...pictureOptions(z),
  };
}

/** A Gallery block's settings as parsed (or as written: every one may be left out). */
export interface GallerySettings {
  show?: (typeof GALLERY_SHOW)[number];
  pictures?: Picture[];
  album?: string;
  tags?: string[];
  tagMatch?: "any" | "all";
  order?: (typeof GALLERY_ORDER)[number];
  count?: number;
  layout?: string;
  filter?: boolean;
}

export interface GallerySelection<P extends Picture = Picture> extends Selection<P> {
  /** The album shown, when it exists. */
  album?: { id: string; name: string };
  /** Why nothing shows, for the editor's dashed box. */
  reason?: string;
}

/**
 * The pictures a Gallery section shows. `albums`: the site's albums by id (only the one it shows is
 * needed). An album that doesn't exist (renamed or deleted) shows nothing and says so in the
 * editor (`missing`), never a failed build.
 */
export function selectPictures<P extends Picture>(
  s: GallerySettings,
  albums: ReadonlyMap<string, Album<P>> | Record<string, Album<P> | undefined>,
  { seed = "" }: { seed?: string } = {},
): GallerySelection<P> {
  // Own keys only: an album named "constructor" must never be Object's.
  const get = (id: string) =>
    albums instanceof Map ? albums.get(id) : Object.hasOwn(albums, id) ? (albums as Record<string, Album<P> | undefined>)[id] : undefined;
  const fromAlbum = s.show === "album";
  const album = fromAlbum && s.album ? get(s.album) : undefined;
  const all: P[] = (fromAlbum ? (album?.pictures ?? []) : ((s.pictures ?? []) as P[])).slice(0, MAX_PICTURES);
  const missing = fromAlbum && s.album && !album ? [s.album] : [];
  const want = wantedTags(s.tags);
  let list: P[] = all;
  if (want) {
    const every = s.tagMatch === "all";
    list = list.filter((p) => tagsMatch(want, p.tags, every));
  }
  if (s.order === "shuffled") {
    const at = new Map<P, number>(list.map((p, i) => [p, i]));
    list = [...list].sort((a, b) => hash(seed + a.src) - hash(seed + b.src) || (at.get(a) ?? 0) - (at.get(b) ?? 0));
  }
  const matched = list.length;
  const items = s.count ? list.slice(0, s.count) : list;
  const out: GallerySelection<P> = { items, matched, missing };
  if (album && s.album) out.album = { id: s.album, name: album.name };
  if (!items.length) out.reason = whyNoPictures(s, all.length, missing.length > 0);
  return out;
}

/** Why a gallery shows nothing, and what to change: said in the editor, never to visitors. */
export function whyNoPictures(s: GallerySettings, total: number, albumMissing = false): string {
  if (s.show === "album") {
    if (!s.album) return "No album is chosen yet: pick one under Show.";
    if (albumMissing) return `The album "${s.album}" no longer exists (renamed or deleted): pick another.`;
    if (!total) return "The album has no pictures yet.";
  } else if (!total) return "No pictures yet: add some under Pictures.";
  const tags = (s.tags ?? []).filter((t) => t.trim());
  if (tags.length > 1 && s.tagMatch === "all") return `No picture has all of the tags ${quoted(tags, "and")}: try "Any of them".`;
  return `No picture is tagged ${quoted(tags, "or")}: pick another tag.`;
}

/** The tags of the pictures shown, for the filter buttons (most used first). */
export const pictureTags = (pictures: readonly Picture[]): TagCount[] => countTags(pictures.map((p) => p.tags));

/** Whether a gallery draws filter buttons: asked for, in a layout that has them, with two tags or more. */
export const galleryFilters = (s: GallerySettings, pictures: readonly Picture[]): TagCount[] => {
  if (!s.filter || s.layout === "carousel") return [];
  const tags = pictureTags(pictures);
  return tags.length > 1 ? tags : [];
};

/** What a Gallery section shows, in a sentence for the editor ("Shows 8 of 12 pictures in Kitchens, tagged Tiles."). */
export function summariseGallery(s: GallerySettings, sel: GallerySelection): { text: string; empty?: string; missing: string[] } {
  if (!sel.items.length) return { text: "Shows no pictures.", empty: sel.reason, missing: sel.missing };
  const where = s.show === "album" ? ` from the album ${sel.album?.name ?? s.album}` : "";
  const tags = (s.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const which = tags.length ? ` tagged ${list(tags, s.tagMatch === "all" ? "and" : "or")}` : "";
  const order = s.order === "shuffled" ? ", shuffled" : "";
  const n = sel.items.length;
  const count = n === sel.matched ? (n === 1 ? "the only picture" : `all ${n} pictures`) : `${n} of ${sel.matched} pictures`;
  return { text: `Shows ${count}${where}${which}${order}.`, missing: sel.missing };
}

const list = (tags: readonly string[], and: string) =>
  tags.length < 2 ? (tags[0] ?? "") : `${tags.slice(0, -1).join(", ")} ${and} ${tags[tags.length - 1]}`;
const quoted = (tags: readonly string[], and: string) =>
  list(
    tags.map((t) => `"${t}"`),
    and,
  );

/** A video's address as the lightbox plays it (YouTube without cookies until played; Vimeo without tracking); null if it isn't one. */
export function videoEmbed(url: string): string | null {
  const yt = url.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?dnt=1`;
  return null;
}

/** A video address the free-form Video element accepts (YouTube or Vimeo), as a pattern. */
export const VIDEO_URL = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[\w-]+/;
