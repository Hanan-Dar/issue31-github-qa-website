// The theme as an Astro integration: every route lives here and is injected into the site, so the
// site folder holds only content, settings and redirects. The site's config is exposed as
// `virtual:site/config`, its menus as `virtual:site/data`, and its colours and fonts as
// `virtual:site/theme.css` (CSS variables the stylesheet uses).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { injectCspHashes } from "./csp";
import { addSrcsets } from "./srcset";
import { colourVars, FONTS, lookVars, type SiteConfig } from "./site-config";
import { matchRedirect, type RedirectRule } from "./worker";

const CONFIG_ID = "virtual:site/config";
const DATA_ID = "virtual:site/data";
const THEME_ID = "virtual:site/theme.css";
// Font packages are the theme's dependencies, so their CSS is imported by absolute path.
const require = createRequire(import.meta.url);

const STACKS = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
};

export function themeCss(site: SiteConfig): string {
  const fonts = [...new Set([site.fonts.heading, site.fonts.body])].map((f) => FONTS[f]).filter((f) => f.pkg);
  const imports = fonts.map((f) => `@import ${JSON.stringify(require.resolve(`${f.pkg}/index.css`))};`);
  const stack = (name: SiteConfig["fonts"]["body"]) => {
    const f = FONTS[name];
    return f.family ? `"${f.family}", ${STACKS[f.fallback]}` : STACKS[f.fallback];
  };
  const vars = {
    ...colourVars(site.colours),
    ...lookVars(site.look),
    "--font-site-heading": stack(site.fonts.heading),
    "--font-site-body": stack(site.fonts.body),
  };
  return `${imports.join("\n")}\n:root {\n${Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}\n`;
}

const route = (pattern: string, file: string) => ({ pattern, entrypoint: new URL(`./routes/${file}`, import.meta.url) });

export function siteTheme(site: SiteConfig): AstroIntegration {
  let root: URL | undefined;
  return {
    name: "@site/theme",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig, config, command }) => {
        root = config.root;
        if (config.site !== site.origin) throw new Error(`astro.config "site" (${config.site}) must equal site.config origin (${site.origin})`);
        // Every URL has no trailing slash (/about, not /about/); changing this changes every URL.
        if (config.trailingSlash !== "never" || config.build.format !== "file")
          throw new Error('astro.config must set trailingSlash: "never" and build.format: "file"');
        const dataDir = fileURLToPath(new URL("./src/data/", config.root));

        const routes = [
          route("/", "index.astro"),
          route("/404", "404.astro"),
          route("/[...slug]", "page.astro"),
          route("/sitemap.xml", "files/sitemap.ts"),
          route("/robots.txt", "files/robots.ts"),
          route("/llms.txt", "files/llms.ts"),
        ];
        if (site.blog) {
          routes.push(route(`/${site.blog.path}`, "blog/index.astro"));
          routes.push(route(`/${site.blog.path}/[slug]`, "blog/post.astro"));
          // Later pages of the index, and each tag's pages (only built when there are some).
          routes.push(route(`/${site.blog.path}/page/[page]`, "blog/paged.astro"));
          routes.push(route(`/${site.blog.path}/tag/[tag]/[...page]`, "blog/tag.astro"));
          // Each year's posts, while an Archive widget links to them.
          routes.push(route(`/${site.blog.path}/year/[year]`, "blog/year.astro"));
          routes.push(route("/rss.xml", "files/rss.ts"));
        }
        // Craeft's Design view (roadmap 16.2): blocks rendered on demand by the live preview's dev
        // server. Never part of a build, so production has no such route.
        if (command === "dev") routes.push(route("/_editor/render", "editor-render.astro"));
        for (const r of routes) injectRoute(r);

        updateConfig({
          vite: {
            // In `astro dev`, the form posts to /api/* on the dev server: send it to the backend
            // running locally (pnpm dev:backend).
            server: { proxy: { "/api": { target: "http://127.0.0.1:8790", changeOrigin: true } } },
            plugins: [
              tailwindcss(),
              {
                name: "site-virtual-modules",
                resolveId: (id) => ([CONFIG_ID, DATA_ID, THEME_ID].includes(id) ? `\0${id}` : undefined),
                load: (id) => {
                  if (id === `\0${CONFIG_ID}`) return `export default ${JSON.stringify(site)};`;
                  if (id === `\0${DATA_ID}`) return `export { default as navigation } from ${JSON.stringify(`${dataDir}navigation.json`)};`;
                  if (id === `\0${THEME_ID}`) return themeCss(site);
                },
              },
            ],
          },
        });
      },
      // `astro dev` (Craeft's live preview too) follows the site's redirects.ts as the Worker does,
      // read again as it changes: otherwise a page deleted with a redirect shows as not found there.
      "astro:server:setup": ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? "/", "http://dev");
          const raw = url.pathname;
          if ((req.method !== "GET" && req.method !== "HEAD") || /^\/(@|_|node_modules\/|src\/)/.test(raw) || !root) return next();
          const path = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
          let hit: { to: string | null } | undefined;
          try {
            const mod = await server.ssrLoadModule(fileURLToPath(new URL("./redirects.ts", root)));
            hit = matchRedirect((mod.redirects ?? []) as RedirectRule[], path);
          } catch {
            return next();
          }
          if (!hit) return next();
          if (hit.to === null) {
            res.writeHead(410, { "Content-Type": "text/plain; charset=utf-8" }).end("Gone");
            return;
          }
          const target = new URL(hit.to, url);
          if (!target.search) target.search = url.search;
          res.writeHead(301, { Location: target.pathname + target.search }).end();
        });
      },
      "astro:build:done": async ({ dir, logger }) => {
        await addSrcsets(fileURLToPath(dir), (m) => logger.info(m));
        await injectCspHashes(fileURLToPath(dir), (m) => logger.info(m));
      },
    },
  };
}
