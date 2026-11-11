// The Archive widget (plan/ux/widgets.md, Wave 3): the blog's posts by year, or by month, with how
// many each has. A year links to its listing page (/<blog>/year/<year>, kept out of the URL contract
// like tag pages: it comes and goes with the posts); a month to its place on that page. Plain data
// in, data out; the theme draws it and builds the year pages.
import { type Def, meta, type ZodApi } from "./options.ts";
import type { PostEntry } from "./posts.ts";

export const ARCHIVE_BY = ["year", "month"] as const;

export interface ArchiveShape {
  by: Def<(typeof ARCHIVE_BY)[number]>;
  max: Def<number>;
  counts: Def<boolean>;
}

/** The Archive's fields, for the theme's block. */
export function archiveSchema(z: ZodApi): ArchiveShape {
  const src = meta("content", "Source");
  const look = meta("style", "Archive");
  return {
    by: z
      .enum(ARCHIVE_BY)
      .default("year")
      .meta(src({ title: "Posts by", labels: { year: "Year", month: "Month" } })),
    max: z
      .number()
      .int()
      .min(1)
      .max(36)
      .default(10)
      .meta(src({ title: "How many", description: "The most years or months shown, newest first (1 to 36)." })),
    counts: z
      .boolean()
      .default(true)
      .meta(look({ title: "How many posts each has", description: "Shown beside each year or month." })),
  };
}

export interface ArchiveSettings {
  by?: (typeof ARCHIVE_BY)[number];
  max?: number;
  counts?: boolean;
}

/** A year, or a month of a year, and how many posts it has. */
export interface ArchivePeriod {
  /** "2026", or "2026-03". */
  key: string;
  year: number;
  /** 1 to 12, for months. */
  month?: number;
  count: number;
}

export interface ArchiveSelection {
  items: ArchivePeriod[];
  /** How many years or months have posts. */
  matched: number;
  reason?: string;
}

/** A month's key and its anchor on the year's page: "2026-03". */
export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/** A post's year and month, as its date reads in UTC (the theme shows dates in UTC). */
export const periodOf = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });

/** Every year with posts, newest first, with how many. */
export function postYears(posts: readonly PostEntry[]): { year: number; count: number }[] {
  const by = new Map<number, number>();
  for (const p of posts) {
    const { year } = periodOf(p.data.date);
    by.set(year, (by.get(year) ?? 0) + 1);
  }
  return [...by].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
}

/** What an Archive shows, from the site's published posts: newest first. */
export function archiveOf(posts: readonly PostEntry[], s: ArchiveSettings = {}): ArchiveSelection {
  const by = new Map<string, ArchivePeriod>();
  for (const p of posts) {
    const { year, month } = periodOf(p.data.date);
    const key = s.by === "month" ? monthKey(year, month) : String(year);
    const at = by.get(key) ?? { key, year, ...(s.by === "month" ? { month } : {}), count: 0 };
    at.count++;
    by.set(key, at);
  }
  const all = [...by.values()].sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0));
  const items = all.slice(0, s.max ?? 10);
  return { items, matched: all.length, ...(items.length ? {} : { reason: "There are no posts yet." }) };
}

/** A month's name in the site's language: (3, "en-GB") → "March". */
export const monthName = (month: number, locale = "en-GB") =>
  new Date(Date.UTC(2000, month - 1, 1)).toLocaleDateString(locale, { month: "long", timeZone: "UTC" });

/** A period as people read it: "2026", "March 2026". */
export const periodName = (p: Pick<ArchivePeriod, "year" | "month">, locale = "en-GB") =>
  p.month ? `${monthName(p.month, locale)} ${p.year}` : String(p.year);

/** The posts of a year, newest first, by month (newest month first): what a year's page lists. */
export function yearPosts<T extends PostEntry>(posts: readonly T[], year: number): { month: number; key: string; posts: T[] }[] {
  const months = new Map<number, T[]>();
  for (const p of posts) {
    const at = periodOf(p.data.date);
    if (at.year !== year) continue;
    months.set(at.month, [...(months.get(at.month) ?? []), p]);
  }
  return [...months]
    .sort((a, b) => b[0] - a[0])
    .map(([month, list]) => ({
      month,
      key: monthKey(year, month),
      posts: list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title)),
    }));
}

/** What an Archive shows, in a sentence for the editor. */
export function summariseArchive(sel: ArchiveSelection, s: ArchiveSettings = {}): string {
  if (!sel.items.length) return "Shows nothing yet: there are no posts.";
  const noun = s.by === "month" ? ["month", "months"] : ["year", "years"];
  const n = sel.items.length;
  const what = n === 1 ? `1 ${noun[0]}` : `${n} ${noun[1]}`;
  return n === sel.matched ? `Shows all ${what} with posts, newest first.` : `Shows the newest ${what} of ${sel.matched}.`;
}
