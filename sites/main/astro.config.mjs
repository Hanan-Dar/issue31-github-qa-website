import { siteTheme } from "@site/theme/integration";
import { defineConfig } from "astro/config";
import { editorBuildInfo } from "./editor-build-info.ts";
import site from "./site.config.ts";

export default defineConfig({
  site: site.origin,
  // Addresses have no trailing slash (/about, not /about/). Changing these changes every address on
  // the site; the theme refuses to build if they differ.
  trailingSlash: "never",
  build: { format: "file" },
  // editorBuildInfo writes dist/_editor/build.json (the branch and commit) for Craeft's editor.
  integrations: [siteTheme(site), editorBuildInfo()],
});
