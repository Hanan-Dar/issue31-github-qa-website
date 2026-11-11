// The Before and after widget (plan/ux/widgets.md, "Wave 2"): two pictures of the same view, one
// over the other with a handle between them that's dragged or moved with the arrow keys
// (<craeft-compare>); with no script, the two side by side. Each picture needs a description; the
// labels ("Before", "After") can be changed or left out. Until both are chosen, visitors see nothing
// and previews say what's missing.
import { type Def, meta, type Opt, type ZodApi } from "./options.ts";

/** One of the two pictures. */
export interface ComparePicture {
  src: string;
  alt: string;
}

export const COMPARE_SHAPES = ["standard", "wide", "square", "tall"] as const;

/** The two pictures (the theme's own schema for one) and their labels. */
export function comparePictureOptions(z: ZodApi, picture: unknown) {
  const m = meta("content", "Pictures");
  return {
    before: (picture as { meta(x: unknown): { optional(): unknown } })
      .meta(m({ title: "Before", description: "The picture on the left: how it was." }))
      .optional() as Opt<ComparePicture>,
    after: (picture as { meta(x: unknown): { optional(): unknown } })
      .meta(m({ title: "After", description: "The picture on the right: how it is now. The same view works best." }))
      .optional() as Opt<ComparePicture>,
    beforeLabel: z
      .string()
      .max(24)
      .optional()
      .meta(m({ title: "Before's label", description: 'Left empty, "Before".', more: true })) as Opt<string>,
    afterLabel: z
      .string()
      .max(24)
      .optional()
      .meta(m({ title: "After's label", description: 'Left empty, "After".', more: true })) as Opt<string>,
    caption: z
      .string()
      .max(200)
      .optional()
      .meta(m({ title: "Caption", description: "A line under the pictures: what was done, where." })) as Opt<string>,
  };
}

/** The slider's settings. */
export function sliderOptions(z: ZodApi) {
  const m = meta("style", "Slider");
  return {
    start: z
      .number()
      .int()
      .min(5)
      .max(95)
      .default(50)
      .meta(
        m({ title: "Starting position", description: "How much of the before picture shows at first, in percent (5 to 95)." }),
      ) as Def<number>,
    labels: z
      .boolean()
      .default(true)
      .meta(m({ title: "Labels", description: "Before and After over the pictures." })) as Def<boolean>,
    shape: z
      .enum(COMPARE_SHAPES)
      .default("standard")
      .meta(
        m({
          title: "Shape",
          description: "Both pictures are cropped to it.",
          labels: { standard: "4:3", wide: "16:9", square: "1:1", tall: "3:4" },
        }),
      ) as Def<(typeof COMPARE_SHAPES)[number]>,
    width: z
      .enum(["normal", "wide"])
      .default("normal")
      .meta(m({ title: "Width", labels: { normal: "Normal", wide: "The section's full width" }, more: true })) as Def<"normal" | "wide">,
  };
}

/** The Before and after widget's fields, for the theme's block. `picture`: the theme's schema for one picture. */
export function compareSchema(z: ZodApi, { picture }: { picture: unknown }) {
  return { ...comparePictureOptions(z, picture), ...sliderOptions(z) };
}

export interface CompareSettings {
  before?: Partial<ComparePicture>;
  after?: Partial<ComparePicture>;
  beforeLabel?: string;
  afterLabel?: string;
  start?: number;
}

/** What the slider draws: its labels, its start (5 to 95), and why it can't yet. */
export function compareOf(s: CompareSettings): { start: number; before: string; after: string; reason?: string } {
  const start = Math.min(95, Math.max(5, Math.round(s.start ?? 50)));
  const missing = [!s.before?.src && "Before", !s.after?.src && "After"].filter(Boolean);
  return {
    start,
    before: s.beforeLabel?.trim() || "Before",
    after: s.afterLabel?.trim() || "After",
    ...(missing.length ? { reason: `Choose the ${missing.join(" and ")} picture${missing.length > 1 ? "s" : ""}.` } : {}),
  };
}

/** What a Before and after section shows, in a sentence for the editor. */
export function summariseCompare(s: CompareSettings): { text: string; empty?: string; missing: string[] } {
  const c = compareOf(s);
  if (c.reason) return { text: "Shows no pictures yet.", empty: c.reason, missing: [] };
  const at = c.start === 50 ? "halfway" : `${c.start}% of the way across`;
  return { text: `Shows ${c.before} and ${c.after}, the handle starting ${at}. Drag it, or use the arrow keys on it.`, missing: [] };
}
