// The Logos widget (plan/ux/widgets.md, "Wave 2"): clients', partners' or accreditations' logos,
// typed in the section or the site's (src/content/logos/<id>.yaml) by tag; in a row, a grid or a
// slowly scrolling strip (with a pause button; still for people who ask for less motion and in
// Craeft's editor); grey until hovered if wanted. Each needs a description; a link is optional.
import {
  type Entry,
  type EntriesSelection,
  type EntriesSettings,
  entrySourceOptions,
  selectEntries,
  summariseEntries,
} from "./collection.ts";
import { type Def, type Layout, layoutOptions, meta, type ZodApi } from "./options.ts";

/** A logo as the theme draws it. */
export interface Logo {
  src: string;
  /** Whose logo it is, for people who can't see it ("Federation of Master Builders"). */
  alt: string;
  link?: string;
  /** Its name in Pages and posts (a collection's logo). */
  name?: string;
  tags?: string[];
  position?: number;
}

export const LOGOS_WORDS = {
  noun: "logo",
  nouns: "logos",
  typed: "These logos",
  collection: "The site's logos",
  folder: "logos",
  tagFormat: "logo-tags",
  typedField: "Logos",
} as const;

/** The most logos a section shows. */
export const MAX_LOGOS = 36;

/** How the logos look. */
export function logoOptions(z: ZodApi) {
  const m = meta("style", "Logos");
  return {
    logoSize: z
      .enum(["s", "m", "l"])
      .default("m")
      .meta(m({ title: "Size", description: "How tall each logo is.", labels: { s: "Small", m: "Medium", l: "Large" } })) as Def<
      "s" | "m" | "l"
    >,
    grey: z
      .boolean()
      .default(false)
      .meta(m({ title: "Grey until hovered", description: "Logos in grey, in colour when pointed at or focused." })) as Def<boolean>,
    boxed: z
      .boolean()
      .default(false)
      .meta(
        m({ title: "On white cards", description: "Each logo on a white card: for logos with white in them on a coloured background." }),
      ) as Def<boolean>,
    stripSpeed: z
      .enum(["slow", "slower"])
      .default("slow")
      .meta(m({ title: "Speed", labels: { slow: "Slow", slower: "Slower" }, more: true, showWhen: { layout: "strip" } })) as Def<
      "slow" | "slower"
    >,
  };
}

/**
 * The Logos widget's fields, for the theme's block: `z.object({ blockType, ...header, tone, items,
 * ...logosSchema(z, { layouts }) })`; the typed `items` are the theme's own.
 */
export function logosSchema<const L extends Layout>(z: ZodApi, { layouts }: { layouts: readonly [L, ...L[]] }) {
  return {
    ...entrySourceOptions(z, LOGOS_WORDS, { max: MAX_LOGOS }),
    ...layoutOptions(z, layouts, { omit: ["filter", "entrance", "equalHeights"], columns: { desktop: 5, tablet: 4, phone: 2 } }),
    ...logoOptions(z),
  };
}

export interface LogosSettings<G extends Logo = Logo> extends EntriesSettings {
  items?: G[];
  layout?: string;
}

/** The logos a Logos section shows. */
export const selectLogos = <G extends Logo>(s: LogosSettings<G>, collection: readonly Entry<G>[] = [], { seed = "" } = {}) =>
  selectEntries<G>(s, s.items, collection, LOGOS_WORDS, { seed, max: MAX_LOGOS, nameOf: (g) => g.name ?? g.alt });

/** What a Logos section shows, in a sentence for the editor. */
export function summariseLogos(s: LogosSettings, sel: EntriesSelection<Logo>) {
  const sum = summariseEntries(s, sel, LOGOS_WORDS);
  const unnamed = sel.items.filter((g) => !g.alt?.trim()).length;
  if (unnamed) sum.text += ` ${unnamed === 1 ? "1 logo needs" : `${unnamed} logos need`} a description.`;
  return sum;
}
