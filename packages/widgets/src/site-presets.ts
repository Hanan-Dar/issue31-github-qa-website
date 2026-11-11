// A site's own presets (plan/ux/widgets.md, "Presets": "a site saves its own with Save as a
// preset"). Kept one file per widget, src/content/presets/<blockType>.yaml: `{ presets: [{ id, name,
// settings }] }`, so saving and deleting are both a change to one file (one Undo). A saved preset is
// a look, as the theme's are (decision 125): the settings presets decide (presetFields), never the
// words or the source.
import type { Preset } from "./presets.ts";

/** One widget's saved presets, as its file holds them. */
export interface SitePresets {
  presets: Preset[];
}

/** Where a widget's saved presets are kept, under the site's src/content/. */
export const presetsFile = (blockType: string) => `presets/${blockType}.yaml`;

/** A preset's id from its name, not one of `taken`: "Our cards" → "our-cards", "our-cards-2". */
export function presetId(name: string, taken: readonly string[]): string {
  const base =
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "preset";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/**
 * A section's look as a preset's settings: the settings presets decide (`fields`, from presetFields),
 * those the section sets; the ones left at their default are left out, as in the theme's presets.
 */
export function lookOf(block: Record<string, unknown>, fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(fields)) {
    const v = block[k];
    if (v === undefined || JSON.stringify(v) === JSON.stringify(def)) continue;
    out[k] = structuredClone(v);
  }
  return out;
}

/** The file with a new preset added at the end (its id made from its name). */
export function addPreset(
  file: SitePresets | null | undefined,
  p: Omit<Preset, "id" | "description"> & { id?: string; description?: string },
): SitePresets {
  const list = file?.presets ?? [];
  const id = presetId(
    p.id ?? p.name,
    list.map((x) => x.id),
  );
  return { presets: [...list, { id, name: p.name.trim(), description: p.description ?? "", settings: p.settings }] };
}

/** The file without the preset `id`. */
export const removePreset = (file: SitePresets | null | undefined, id: string): SitePresets => ({
  presets: (file?.presets ?? []).filter((p) => p.id !== id),
});

/**
 * A site's presets for a widget, as the editor lists them after the theme's: each id made distinct
 * from the theme's ("site:<id>"), marked as the site's own. Bad entries are left out.
 */
export function sitePresetsOf(file: unknown): (Preset & { site: true })[] {
  const list = (file as SitePresets | null)?.presets;
  if (!Array.isArray(list)) return [];
  return list.flatMap((p) =>
    p && typeof p.id === "string" && typeof p.name === "string" && p.settings && typeof p.settings === "object"
      ? [
          {
            id: `site:${p.id}`,
            name: p.name,
            description: typeof p.description === "string" ? p.description : "",
            settings: p.settings,
            site: true as const,
          },
        ]
      : [],
  );
}
