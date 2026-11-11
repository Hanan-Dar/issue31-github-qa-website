// The Team widget (plan/ux/widgets.md, "Wave 2"): the people typed in the section (as before
// widgets), or the site's team (src/content/team/<id>.yaml) by tag; as a grid, a carousel or a list;
// photos in a shape; their email, phone, LinkedIn and website as icons.
import { WEB_LINK } from "./links.ts";
import {
  type Entry,
  type EntriesSelection,
  type EntriesSettings,
  entrySourceOptions,
  selectEntries,
  summariseEntries,
} from "./collection.ts";
import { carouselOptions, type Def, type Layout, layoutOptions, meta, type ZodApi } from "./options.ts";

/** A person as the theme draws them (a typed one, or a team member's file). */
export interface Person {
  name: string;
  role: string;
  bio?: string;
  photo?: { src: string; alt: string };
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  tags?: string[];
  position?: number;
}

export const TEAM_WORDS = {
  noun: "team member",
  nouns: "team members",
  typed: "These people",
  collection: "The site's team",
  folder: "team",
  tagFormat: "team-tags",
  typedField: "People",
} as const;

export const PHOTO_SHAPES = ["circle", "rounded", "square", "portrait"] as const;

/** How each person looks. */
export function peopleOptions(z: ZodApi) {
  const m = meta("style", "People");
  return {
    cardStyle: z
      .enum(["plain", "bordered", "raised"])
      .default("raised")
      .meta(m({ title: "Card style", labels: { plain: "Plain", bordered: "Bordered", raised: "Raised" } })) as Def<
      "plain" | "bordered" | "raised"
    >,
    photoShape: z
      .enum(PHOTO_SHAPES)
      .default("circle")
      .meta(
        m({
          title: "Photo shape",
          description: "Without a photo, their initials are shown in the same shape.",
          labels: { circle: "Circle", rounded: "Rounded square", square: "Square", portrait: "Tall (3:4)" },
        }),
      ) as Def<(typeof PHOTO_SHAPES)[number]>,
    bio: z
      .boolean()
      .default(true)
      .meta(m({ title: "Short bio", description: "Each person's bio, when they have one." })) as Def<boolean>,
    contact: z
      .boolean()
      .default(true)
      .meta(
        m({ title: "Contact links", description: "Email, phone, LinkedIn and website as small icons, for those who have them." }),
      ) as Def<boolean>,
  };
}

/**
 * The Team widget's fields, for the theme's block: `z.object({ blockType, ...header, tone, people,
 * ...teamSchema(z, { layouts }) })`; the typed `people` stay the theme's own.
 */
export function teamSchema<const L extends Layout>(z: ZodApi, { layouts }: { layouts: readonly [L, ...L[]] }) {
  return {
    ...entrySourceOptions(z, TEAM_WORDS),
    ...layoutOptions(z, layouts, { omit: ["filter", "entrance"] }),
    ...carouselOptions(z),
    ...peopleOptions(z),
  };
}

export interface TeamSettings<P extends Person = Person> extends EntriesSettings {
  people?: P[];
  layout?: string;
}

/** The people a Team section shows. `collection`: the site's team (only read when the section shows it). */
export const selectPeople = <P extends Person>(s: TeamSettings<P>, collection: readonly Entry<P>[] = [], { seed = "" } = {}) =>
  selectEntries<P>(s, s.people, collection, TEAM_WORDS, { seed, nameOf: (p) => p.name });

/** What a Team section shows, in a sentence for the editor. */
export const summariseTeam = (s: TeamSettings, sel: EntriesSelection<Person>) => summariseEntries(s, sel, TEAM_WORDS);

/** A person's initials, shown without a photo ("Jo Bloggs" → "JB"). */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export interface ContactLink {
  kind: "email" | "phone" | "linkedin" | "website";
  href: string;
  /** What a screen reader says ("Email Jo Bloggs"). */
  label: string;
}

/** A person's contact links, in a fixed order, each with its address and its words. */
export function contactLinks(p: Person): ContactLink[] {
  const out: ContactLink[] = [];
  if (p.email) out.push({ kind: "email", href: `mailto:${p.email}`, label: `Email ${p.name}` });
  if (p.phone) out.push({ kind: "phone", href: `tel:${p.phone.replace(/[^\d+]/g, "")}`, label: `Call ${p.name}` });
  // Web addresses only, whatever the data holds (the theme's schema refuses others too).
  if (p.linkedin && WEB_LINK.test(p.linkedin)) out.push({ kind: "linkedin", href: p.linkedin, label: `${p.name} on LinkedIn` });
  if (p.website && WEB_LINK.test(p.website)) out.push({ kind: "website", href: p.website, label: `${p.name}'s website` });
  return out;
}
