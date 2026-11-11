// Gallery sections' settings as classes. Every class is written out in full here, so Tailwind finds
// it; per-device values go phone (no prefix) → tablet (md:) → desktop (lg:). Left out, a gallery
// has two columns on phones and three from tablets up.
import type { z } from "astro/zod";
import type { GalleryBlock } from "../schema";

export type GalleryData = z.infer<typeof GalleryBlock>;
type Dev = { desktop: number; tablet?: number; phone?: number };

const GRID = {
  phone: ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6"],
  tablet: ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5", "md:grid-cols-6"],
  desktop: ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6"],
} as const;
const MASONRY = {
  phone: ["", "columns-1", "columns-2", "columns-3", "columns-4", "columns-5", "columns-6"],
  tablet: ["", "md:columns-1", "md:columns-2", "md:columns-3", "md:columns-4", "md:columns-5", "md:columns-6"],
  desktop: ["", "lg:columns-1", "lg:columns-2", "lg:columns-3", "lg:columns-4", "lg:columns-5", "lg:columns-6"],
} as const;

/** Columns per device: a grid's, or masonry's. */
export function galleryColumns(v: Dev | undefined, masonry: boolean): string[] {
  const t = masonry ? MASONRY : GRID;
  const desktop = v?.desktop ?? 3;
  return [t.phone[v?.phone ?? 2], t.tablet[v?.tablet ?? desktop], t.desktop[desktop]];
}

/** How wide each picture shows, for the browser to pick its smaller copy (srcset, issue #34). */
export function gallerySizes(v: Dev | undefined): string {
  const desktop = v?.desktop ?? 3;
  const vw = (n: number) => `${Math.ceil(100 / n)}vw`;
  return `(min-width: 1024px) ${vw(desktop)}, (min-width: 768px) ${vw(v?.tablet ?? desktop)}, ${vw(v?.phone ?? 2)}`;
}

/** Space between pictures (masonry's goes under each one too). */
export const GALLERY_GAP = { s: "gap-2", m: "gap-4", l: "gap-6" } as const;
export const MASONRY_GAP = { s: "gap-2 [&>li]:mb-2", m: "gap-4 [&>li]:mb-4", l: "gap-6 [&>li]:mb-6" } as const;

export const SHAPE = { natural: "", square: "aspect-square", standard: "aspect-[4/3]", wide: "aspect-video" } as const;
export const HOVER = {
  none: "",
  zoom: "transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none",
  darken: "transition group-hover:brightness-75",
} as const;
