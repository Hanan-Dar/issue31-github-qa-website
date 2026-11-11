// The Pricing widget (plan/ux/widgets.md, "Wave 2"): plans typed in the section (name, price, what's
// in it, a button, a "Most popular" flag), side by side, scrolling sideways on phones if wanted; and,
// if wanted, a monthly or yearly switch (each plan then has a yearly price; with no script the
// monthly price shows with the yearly one listed under it).
import { type Def, meta, type Opt, type ZodApi } from "./options.ts";

/** A plan as the theme draws it. */
export interface Plan {
  name: string;
  description?: string;
  /** As shown: "£29", "From £120", "Free". */
  price: string;
  /** After the price: "a month", "per visit". */
  period?: string;
  /** With the switch: the yearly price ("£290") and its words ("a year"). */
  yearlyPrice?: string;
  yearlyPeriod?: string;
  /** What's included, each inline Markdown. */
  points?: string[];
  button?: { label: string; href: string };
  popular?: boolean;
}

/** The most plans a section shows. */
export const MAX_PLANS = 6;

/** The plans (typed; the theme's own schema for one) and the switch. */
export function planOptions(z: ZodApi, plan: unknown) {
  const m = meta("content", "Plans");
  return {
    plans: z
      .array(plan)
      .min(1)
      .max(MAX_PLANS)
      .meta(m({ title: "Plans", description: `1 to ${MAX_PLANS}. Mark one "Most popular" to make it stand out.` })) as unknown as {
      readonly _zod: { output: Plan[]; input: Plan[]; optout: undefined; optin: undefined };
    },
    billing: z
      .enum(["one", "switch"])
      .default("one")
      .meta(
        m({
          title: "Prices",
          description: "One price each, or a switch between monthly and yearly prices (give each plan its yearly price).",
          labels: { one: "One price each", switch: "Monthly or yearly switch" },
        }),
      ) as Def<"one" | "switch">,
    monthlyLabel: z
      .string()
      .max(24)
      .optional()
      .meta(
        m({ title: "First choice's words", description: 'Left empty, "Monthly".', more: true, showWhen: { billing: "switch" } }),
      ) as Opt<string>,
    yearlyLabel: z
      .string()
      .max(24)
      .optional()
      .meta(
        m({ title: "Second choice's words", description: 'Left empty, "Yearly".', more: true, showWhen: { billing: "switch" } }),
      ) as Opt<string>,
    yearlyNote: z
      .string()
      .max(40)
      .optional()
      .meta(
        m({ title: "Beside the yearly choice", description: 'E.g. "2 months free". Keep it true.', showWhen: { billing: "switch" } }),
      ) as Opt<string>,
    note: z
      .string()
      .max(200)
      .optional()
      .meta(
        m({ title: "Under the plans", description: 'E.g. "Prices include VAT." Left empty, none.', format: "markdown-inline" }),
      ) as Opt<string>,
  };
}

/** How the plans look. */
export function priceOptions(z: ZodApi) {
  const m = meta("style", "Prices");
  return {
    cardStyle: z
      .enum(["bordered", "raised"])
      .default("raised")
      .meta(m({ title: "Card style", labels: { bordered: "Bordered", raised: "Raised" } })) as Def<"bordered" | "raised">,
    phones: z
      .enum(["carousel", "stack"])
      .default("carousel")
      .meta(
        m({
          title: "On phones",
          description: "Side by side, scrolling sideways, or one under another.",
          labels: { carousel: "Scroll sideways", stack: "One under another" },
        }),
      ) as Def<"carousel" | "stack">,
    align: z
      .enum(["left", "center"])
      .default("left")
      .meta(m({ title: "Words", labels: { left: "Left", center: "Centred" }, more: true })) as Def<"left" | "center">,
  };
}

/** The Pricing widget's fields, for the theme's block. `plan`: the theme's schema for one plan. */
export function pricingSchema(z: ZodApi, { plan }: { plan: unknown }) {
  return { ...planOptions(z, plan), ...priceOptions(z) };
}

export interface PricingSettings<P extends Plan = Plan> {
  plans?: P[];
  billing?: "one" | "switch";
}

export interface PricingSelection<P extends Plan = Plan> {
  plans: P[];
  /** Whether the monthly/yearly switch is drawn (asked for, and some plan has a yearly price). */
  toggle: boolean;
  /** Plans with no yearly price (they show their one price either way). */
  noYearly: string[];
  /** The "Most popular" plan's place, if one is marked (only the first counts). */
  popular: number;
}

/** What a Pricing section draws. */
export function selectPlans<P extends Plan>(s: PricingSettings<P>): PricingSelection<P> {
  const plans = (s.plans ?? []).slice(0, MAX_PLANS);
  const asked = s.billing === "switch";
  const noYearly = asked ? plans.filter((p) => !p.yearlyPrice).map((p) => p.name) : [];
  return {
    plans,
    toggle: asked && noYearly.length < plans.length,
    noYearly,
    popular: plans.findIndex((p) => p.popular),
  };
}

/** What a Pricing section shows, in a sentence for the editor. */
export function summarisePricing(s: PricingSettings, sel: PricingSelection): { text: string; empty?: string; missing: string[] } {
  const n = sel.plans.length;
  if (!n) return { text: "Shows no plans.", empty: "No plans yet: add one under Plans.", missing: [] };
  const popular = sel.popular >= 0 ? `, ${sel.plans[sel.popular].name || "one"} marked most popular` : "";
  const prices = s.billing !== "switch" ? "" : sel.toggle ? ", with a monthly or yearly switch" : "";
  const gaps =
    s.billing !== "switch" || !sel.noYearly.length
      ? ""
      : sel.toggle
        ? ` ${list(sel.noYearly)} ${sel.noYearly.length === 1 ? "has" : "have"} no yearly price, so ${sel.noYearly.length === 1 ? "it shows its" : "they show their"} one price either way.`
        : " No plan has a yearly price yet, so there's no switch.";
  return { text: `Shows ${n === 1 ? "1 plan" : `${n} plans`}${popular}${prices}.${gaps}`, missing: [] };
}

const list = (names: readonly string[]) =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
