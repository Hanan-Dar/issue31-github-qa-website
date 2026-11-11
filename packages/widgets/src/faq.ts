// The FAQ widget (plan/ux/widgets.md, "Wave 2"): questions typed in the section (as before widgets),
// or the site's questions (src/content/faq/<id>.yaml) by tag; as an accordion (each opening in
// place, with no script), two columns or a list; the first one open or all closed. Search engines
// are given exactly the questions shown (FAQPage structured data, as before).
import {
  type Entry,
  type EntriesSelection,
  type EntriesSettings,
  entrySourceOptions,
  selectEntries,
  summariseEntries,
} from "./collection.ts";
import { type Def, type Layout, layoutOptions, meta, type ZodApi } from "./options.ts";

/** A question and its answer (inline Markdown). */
export interface Question {
  question: string;
  answer: string;
  tags?: string[];
  position?: number;
}

export const FAQ_WORDS = {
  noun: "question",
  nouns: "questions",
  typed: "These questions",
  collection: "The site's questions",
  folder: "faq",
  tagFormat: "faq-tags",
  typedField: "Questions",
} as const;

/** How the questions look. */
export function questionOptions(z: ZodApi) {
  const m = meta("style", "Questions");
  return {
    open: z
      .enum(["none", "first"])
      .default("none")
      .meta(
        m({
          title: "Open at first",
          description: "In an accordion: every question closed, or the first one open.",
          labels: { none: "All closed", first: "The first one" },
          showWhen: { layout: "accordion" },
        }),
      ) as Def<"none" | "first">,
  };
}

/**
 * The FAQ widget's fields, for the theme's block: `z.object({ blockType, ...header, tone, items,
 * ...faqSchema(z, { layouts }) })`; the typed `items` stay the theme's own.
 */
export function faqSchema<const L extends Layout>(z: ZodApi, { layouts }: { layouts: readonly [L, ...L[]] }) {
  const { layout } = layoutOptions(z, layouts, { omit: ["filter", "entrance", "gap", "equalHeights"] });
  return { ...entrySourceOptions(z, FAQ_WORDS, { max: 48 }), layout, ...questionOptions(z) };
}

export interface FaqSettings<Q extends Question = Question> extends EntriesSettings {
  items?: Q[];
  layout?: string;
}

/** The questions an FAQ section shows (and gives search engines). */
export const selectQuestions = <Q extends Question>(s: FaqSettings<Q>, collection: readonly Entry<Q>[] = [], { seed = "" } = {}) =>
  selectEntries<Q>(s, s.items, collection, FAQ_WORDS, { seed, max: 48, nameOf: (q) => q.question });

/** What an FAQ section shows, in a sentence for the editor. */
export const summariseFaq = (s: FaqSettings, sel: EntriesSelection<Question>) => summariseEntries(s, sel, FAQ_WORDS);
