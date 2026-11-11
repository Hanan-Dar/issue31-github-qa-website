// Posts sections' settings as classes. Every class is written out in full here, so Tailwind finds
// it; per-device values go phone (no prefix) → tablet (md:) → desktop (lg:). Tablet follows desktop
// when left out; phones show one column unless set.
import type { z } from "astro/zod";
import type { PostsBlock } from "../schema";

export type PostsData = z.infer<typeof PostsBlock>;
type Dev = { desktop: number; tablet?: number; phone?: number };

const COLS = {
  phone: ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6"],
  tablet: ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5", "md:grid-cols-6"],
  desktop: ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6"],
} as const;

/** Columns of a grid: left out, today's Latest posts (one on phones, two on tablets, three on computers). */
export function columnsClass(v: Dev | undefined): string[] {
  if (!v) return ["md:grid-cols-2", "lg:grid-cols-3"];
  const tablet = v.tablet ?? v.desktop;
  return [COLS.phone[v.phone ?? 1], COLS.tablet[tablet], COLS.desktop[v.desktop]];
}

export const GAP = { s: "gap-3", m: "gap-5", l: "gap-8" } as const;

// A carousel's items in view per device, and part of the next one showing (peek): each item's width
// comes from these two variables (see Carousel.astro).
const VIEW = {
  phone: ["", "[--view:1]", "[--view:2]", "[--view:3]", "[--view:4]", "[--view:5]", "[--view:6]"],
  tablet: ["", "md:[--view:1]", "md:[--view:2]", "md:[--view:3]", "md:[--view:4]", "md:[--view:5]", "md:[--view:6]"],
  desktop: ["", "lg:[--view:1]", "lg:[--view:2]", "lg:[--view:3]", "lg:[--view:4]", "lg:[--view:5]", "lg:[--view:6]"],
} as const;

/** Items in view: left out, three on computers, two on tablets, one on phones. */
export function viewClass(v: Dev | undefined): string[] {
  const d = v ?? { desktop: 3, tablet: 2 };
  const tablet = d.tablet ?? d.desktop;
  return [VIEW.phone[d.phone ?? 1], VIEW.tablet[tablet], VIEW.desktop[d.desktop]];
}

/** The items' card settings, as PostCard takes them. */
export const lookOf = (d: PostsData) => ({
  cardStyle: d.cardStyle,
  picture: d.picture,
  pictureShape: d.pictureShape,
  picturePosition: d.picturePosition,
  pictureHover: d.pictureHover,
  parts: d.parts,
  summaryLength: d.summaryLength,
  titleSize: d.titleSize,
  readMoreText: d.readMoreText,
});
export type CardLook = ReturnType<typeof lookOf>;

/** Entrance motion's starting state per effect (craeft-entrance sets data-enter="wait" until an item is in view). */
export const ENTRANCE = {
  none: "",
  fade: "transition-opacity duration-700 ease-out data-[enter=wait]:opacity-0",
  rise: "transition duration-700 ease-out data-[enter=wait]:translate-y-6 data-[enter=wait]:opacity-0",
} as const;
