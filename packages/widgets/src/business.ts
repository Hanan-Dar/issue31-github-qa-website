// The Business details widget (plan/ux/widgets.md, Wave 3): the business's name, address, phone,
// email and opening hours, from its settings (sites/main/src/data/business.json), whichever parts
// the section picks, in its order. Plain data in, data out; the theme draws it.
import { type Def, meta, type ZodApi } from "./options.ts";

export const BUSINESS_PARTS = ["name", "address", "phone", "email", "hours"] as const;
export type BusinessPart = (typeof BUSINESS_PARTS)[number];
export const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Weekday = (typeof WEEK)[number];

export interface BusinessShape {
  parts: Def<BusinessPart[]>;
  hours: Def<"grouped" | "week">;
  directions: Def<boolean>;
  icons: Def<boolean>;
}

/** The Business details' fields, for the theme's block. */
export function businessSchema(z: ZodApi): BusinessShape {
  const src = meta("content", "Source");
  const look = meta("style", "Details");
  return {
    parts: z
      .array(z.enum(BUSINESS_PARTS))
      .refine((a: string[]) => new Set(a).size === a.length, "Each part once")
      .default(["address", "phone", "email", "hours"])
      .meta(
        src({
          title: "Shows",
          uniqueItems: true,
          description:
            "Each on or off, in the order shown. They come from the business's details (src/data/business.json; ask in Chat to change them).",
          labels: { name: "Name", address: "Address", phone: "Phone", email: "Email", hours: "Opening hours" },
        }),
      ),
    hours: z
      .enum(["grouped", "week"])
      .default("grouped")
      .meta(look({ title: "Opening hours", labels: { grouped: "Days with the same hours together", week: "Every day" } })),
    directions: z
      .boolean()
      .default(true)
      .meta(look({ title: '"Get directions" link', description: "Under the address, when the business has a map link." })),
    icons: z
      .boolean()
      .default(true)
      .meta(look({ title: "Icons", description: "A small icon before each part." })),
  };
}

export interface BusinessSettings {
  parts?: BusinessPart[];
  hours?: "grouped" | "week";
}

/** The business as its settings give it (the theme's SiteConfig has these). */
export interface BusinessFacts {
  name: string;
  contact: { email: string; phone?: string };
  address?: { street?: string; locality: string; region?: string; postalCode?: string; country: string };
  openingHours: { day: string; opens: string; closes: string }[];
}

/** The parts asked for that the business has (no phone number: no Phone line), in their order. */
export function businessParts(b: BusinessFacts, s: BusinessSettings = {}): BusinessPart[] {
  const has: Record<BusinessPart, boolean> = {
    name: !!b.name,
    address: !!b.address,
    phone: !!b.contact.phone,
    email: !!b.contact.email,
    hours: b.openingHours.length > 0,
  };
  return (s.parts ?? ["address", "phone", "email", "hours"]).filter((p) => has[p]);
}

/** Days in a row with the same hours: "Monday to Friday, 9am to 5pm"; closed days too (slots null). */
export interface DayRun {
  from: Weekday;
  to: Weekday;
  /** The hours each of those days ("09:00" to "17:00", maybe more than one); null: closed. */
  slots: { opens: string; closes: string }[] | null;
}

/** The week's opening hours, days with the same hours together (Monday first). */
export function groupHours(hours: BusinessFacts["openingHours"], { together = true } = {}): DayRun[] {
  const runs: DayRun[] = [];
  for (const day of WEEK) {
    const slots = hours.filter((h) => h.day === day).map((h) => ({ opens: h.opens, closes: h.closes }));
    const now = slots.length ? slots : null;
    const last = runs.at(-1);
    if (together && last && JSON.stringify(last.slots) === JSON.stringify(now)) last.to = day;
    else runs.push({ from: day, to: day, slots: now });
  }
  return runs;
}

/** What a Business details section shows, in a sentence for the editor (and what's missing). */
export function summariseBusiness(b: BusinessFacts, s: BusinessSettings = {}): { text: string; missing: BusinessPart[] } {
  const asked = s.parts ?? ["address", "phone", "email", "hours"];
  const shown = businessParts(b, s);
  const NAMES: Record<BusinessPart, string> = {
    name: "the name",
    address: "the address",
    phone: "the phone number",
    email: "the email address",
    hours: "the opening hours",
  };
  const words = shown.map((p) => NAMES[p]);
  const text = words.length
    ? `Shows ${words.length < 2 ? words[0] : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`}.`
    : "Shows nothing: pick what to show.";
  return { text, missing: asked.filter((p) => !shown.includes(p)) };
}
