// A section's first problem in the words Craeft's form uses (its fields' titles), for the note Edit
// draws in place of a section that can't be drawn yet: "Pictures 1 › Picture: Choose a picture",
// not "pictures › 0 › src: …".
import { z } from "astro/zod";

type Def = { type: string; shape?: Record<string, z.ZodType>; element?: z.ZodType; innerType?: z.ZodType; in?: z.ZodType; options?: z.ZodType[]; getter?: () => z.ZodType };
const def = (s: z.ZodType) => (s as unknown as { _zod: { def: Def } })._zod.def;
const title = (s: z.ZodType) => z.globalRegistry.get(s)?.title as string | undefined;
const words = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

/** The schema itself, past optional, default, lazy and the like, and a union's option that fits `value`. */
function unwrap(s: z.ZodType, value: unknown): z.ZodType {
  for (let i = 0; i < 20; i++) {
    const d = def(s);
    if (d.innerType) s = d.innerType;
    else if (d.type === "pipe" && d.in) s = d.in;
    else if (d.type === "lazy" && d.getter) s = d.getter();
    else if (d.type === "union" && d.options) {
      const fits = d.options.find((o) => o.safeParse(value).success) ?? d.options.find((o) => sameKind(o, value)) ?? d.options[0];
      if (!fits) return s;
      s = fits;
    } else return s;
  }
  return s;
}

/** A union option whose literal fields (blockType, element) match the value's. */
function sameKind(o: z.ZodType, value: unknown): boolean {
  const shape = def(unwrap(o, undefined)).shape;
  if (!shape || !value || typeof value !== "object") return false;
  const lits = Object.entries(shape).filter(([, f]) => def(f).type === "literal");
  return lits.length > 0 && lits.every(([k, f]) => f.safeParse((value as Record<string, unknown>)[k]).success);
}

/** "Pictures 1 › Picture: A picture under /media/" for an issue at `path` in `value`. */
export function describeProblem(schema: z.ZodType, value: unknown, issue: { path: PropertyKey[]; message: string }): string {
  const parts: string[] = [];
  let s: z.ZodType | undefined = schema;
  let v = value;
  for (const key of issue.path) {
    const here: z.ZodType | undefined = s && unwrap(s, v);
    const d: Def | undefined = here ? def(here) : undefined;
    if (typeof key === "number") {
      if (parts.length) parts[parts.length - 1] += ` ${key + 1}`;
      else parts.push(`Item ${key + 1}`);
      s = d?.element;
    } else {
      const k = String(key);
      s = d?.shape?.[k];
      parts.push((s && (title(s) ?? title(unwrap(s, undefined)))) || words(k));
    }
    v = v && typeof v === "object" ? (v as Record<PropertyKey, unknown>)[key] : undefined;
  }
  return parts.length ? `${parts.join(" › ")}: ${issue.message}` : issue.message;
}
