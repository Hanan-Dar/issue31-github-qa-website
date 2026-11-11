// Writes packages/theme/blocks.schema.json from the theme's zod schema (src/blocks/schema.ts):
// the blocks a page may hold and a post's front matter, with their titles and hints, for editors
// (Craeft's writing mode shows them as forms). `--check` fails if the file is out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { editorSchema } = await import("../packages/theme/src/blocks/schema.ts");
const file = fileURLToPath(new URL("../packages/theme/blocks.schema.json", import.meta.url));
const text = `${JSON.stringify(editorSchema(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  let old = "";
  try {
    old = readFileSync(file, "utf8");
  } catch {}
  if (old !== text) {
    console.error("packages/theme/blocks.schema.json is out of date: run `pnpm schema` and commit it.");
    process.exit(1);
  }
} else writeFileSync(file, text);
