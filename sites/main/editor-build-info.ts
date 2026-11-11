// Craeft site kit: an Astro integration that writes dist/_editor/build.json with the branch and
// commit Workers Builds is building (plan/reference/architecture.md, the site kit). The kit reads it through ASSETS,
// and only preview builds ever serve /_editor/*.
import { mkdir, writeFile } from "node:fs/promises";

export function editorBuildInfo() {
  return {
    name: "craeft-build-info",
    hooks: {
      "astro:build:done": async ({ dir }: { dir: URL }) => {
        const out = new URL("_editor/", dir);
        await mkdir(out, { recursive: true });
        const info = {
          branch: process.env.WORKERS_CI_BRANCH ?? "local",
          commit: process.env.WORKERS_CI_COMMIT_SHA ?? "local",
          builtAt: new Date().toISOString(),
        };
        await writeFile(new URL("build.json", out), JSON.stringify(info));
      },
    },
  };
}
