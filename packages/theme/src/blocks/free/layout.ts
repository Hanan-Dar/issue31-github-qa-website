// Free-form sections' settings as classes (roadmap 16.1). Every class is written out in full here,
// so Tailwind finds it; per-device values go phone (no prefix) → tablet (md:) → desktop (lg:).
// Tablet follows desktop and phone follows tablet when left out, except columns: phones show one.

type Dev<T> = { desktop: T; tablet?: T; phone?: T };

const COLS = {
  phone: { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" },
  tablet: { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" },
  desktop: { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" },
} as const;
const SPAN = {
  tablet: { 1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4" },
  desktop: { 1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4" },
} as const;
const PAD = {
  phone: { s: "py-6", m: "py-10", l: "py-14", xl: "py-20" },
  tablet: { s: "md:py-8", m: "md:py-12", l: "md:py-16", xl: "md:py-24" },
  desktop: { s: "lg:py-8", m: "lg:py-14", l: "lg:py-20", xl: "lg:py-28" },
} as const;
const ALIGN = {
  phone: { start: "text-left", center: "text-center", end: "text-right" },
  tablet: { start: "md:text-left", center: "md:text-center", end: "md:text-right" },
  desktop: { start: "lg:text-left", center: "lg:text-center", end: "lg:text-right" },
} as const;
const JUSTIFY = {
  phone: { start: "justify-start", center: "justify-center", end: "justify-end" },
  tablet: { start: "md:justify-start", center: "md:justify-center", end: "md:justify-end" },
  desktop: { start: "lg:justify-start", center: "lg:justify-center", end: "lg:justify-end" },
} as const;
const SPACE = {
  phone: { s: "h-4", m: "h-8", l: "h-14", xl: "h-24" },
  tablet: { s: "md:h-4", m: "md:h-8", l: "md:h-14", xl: "md:h-24" },
  desktop: { s: "lg:h-4", m: "lg:h-8", l: "lg:h-14", xl: "lg:h-24" },
} as const;
const HIDE = { phone: "max-md:hidden", tablet: "md:max-lg:hidden", desktop: "lg:hidden" } as const;

function per<T extends string | number>(v: Dev<T> | undefined, table: Record<"phone" | "tablet" | "desktop", Record<string, string>>, phoneDefault?: T) {
  if (!v) return [];
  const tablet = v.tablet ?? v.desktop;
  const phone = v.phone ?? phoneDefault ?? tablet;
  return [table.phone[String(phone)], table.tablet[String(tablet)], table.desktop[String(v.desktop)]];
}

export const columnsClass = (v: Dev<1 | 2 | 3 | 4>) => per(v, COLS, 1);
export const spanClass = (span: number | undefined, cols: Dev<number>) => {
  if (!span || span <= 1) return [];
  const t = Math.min(span, cols.tablet ?? cols.desktop) as 1 | 2 | 3 | 4;
  const d = Math.min(span, cols.desktop) as 1 | 2 | 3 | 4;
  return [SPAN.tablet[t], SPAN.desktop[d]];
};
export const paddingClass = (v: Dev<"s" | "m" | "l" | "xl"> | undefined) => (v ? per(v, PAD) : ["py-16", "lg:py-24"]);
export const alignClass = (v: Dev<"start" | "center" | "end"> | undefined) => per(v, ALIGN);
export const justifyClass = (v: Dev<"start" | "center" | "end"> | undefined) => per(v, JUSTIFY);
export const spaceClass = (v: Dev<"s" | "m" | "l" | "xl">) => per(v, SPACE);
export const hideClass = (on: ("desktop" | "tablet" | "phone")[] | undefined) => (on ?? []).map((d) => HIDE[d]);
export const GAP = { s: "gap-4", m: "gap-6 lg:gap-8", l: "gap-8 lg:gap-14" } as const;
export const WIDTH = { narrow: "max-w-3xl mx-auto", normal: "", wide: "max-w-none" } as const;
export const VALIGN = { start: "items-start", center: "items-center", end: "items-end" } as const;
export const HEADING_SIZE = { s: "text-xl", m: "text-2xl md:text-3xl", l: "text-3xl md:text-4xl", xl: "text-4xl md:text-5xl" } as const;

/** A YouTube or Vimeo address as its privacy-friendly embed address. */
export function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?dnt=1`;
  return null;
}
