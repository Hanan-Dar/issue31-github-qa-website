# Working on this website (people and AI agents)

The website of Issue31 GitHub QA: an Astro site served by a Cloudflare Worker, with a small backend Worker
for the contact form. It is edited in Craeft (https://craeft.org): every change is a branch with a
preview, and goes live once its checks pass.

## Where things are

| Path | What it is |
|---|---|
| `sites/main/src/data/business.json` | The business's details: name, legal name, what it does, contact details, address, areas, opening hours, map link, logo, social links |
| `sites/main/site.config.ts` | The site's settings: its address, language, pages switched on or off, the blog, the form |
| `sites/main/src/content/pages/` | One YAML file per page (`about.yaml` → `/about`, `index.yaml` → `/`): its title, search text and blocks |
| `sites/main/src/content/blog/` | Blog posts in Markdown (when the site has a blog); `tags` give each tag a page (`/<blog>/tag/<tag>`), `featured: true` puts a post first where a list asks |
| `sites/main/src/content/albums/`, `testimonials/` | One YAML file per album (`name`, `pictures`: `src` under /media/, `alt`, `caption?`, `tags?`, `link?`, `video?`) or testimonial (`quote`, `name`, `role?`, `company?`, `photo?`, `rating?`, `tags?`), shown by Gallery and Reviews sections (`show: album`, `album: <id>`; `show: collection`) |
| `sites/main/src/content/team/`, `faq/`, `logos/` | One YAML file per person (`name`, `role`, `bio?`, `photo?`, `email?`, `phone?`, `linkedin?`, `website?`), question (`question`, `answer`) or logo (`name`, `src`, `alt`, `link?`), each with `tags?` and `position?` (lower first), shown by Team, FAQ and Logos sections with `show: collection` (and `tags`) |
| `sites/main/src/data/navigation.json` | The main menu, its button and the footer's link columns |
| `sites/main/public/media/` | Images and the logo |
| `sites/main/public/favicons/` | The icon browsers show in the tab: keep it matching the logo |
| `sites/main/redirects.ts` | Old addresses and where they go |
| `sites/main/url-contract.json` | Every address the site has published, and what it must answer |
| `packages/theme/` | The design and every route: blocks (`src/blocks/schema.ts` lists what each may contain), layouts, SEO, the form |
| `packages/widgets/` | Craeft's widgets: what a Posts, Gallery, Reviews, Team, FAQ, Logos, Child pages, Pricing, Before and after, Tag list, Archive, Business details or Social links section shows, and their scripts. Kept up to date by Craeft: change the look in the theme (`src/blocks/posts/`, `gallery/`, `testimonials/`, `team/`, `logos/`, `child-pages/`, `area/`, the blocks' own `.astro` files), never here |
| `sites/main/src/content/widget-areas/` | Widgets beyond a page's own sections: `footer.yaml` (columns above the copyright line) and `post-sidebar.yaml` (beside each post, shown only with `on: true`): `{ on?, blocks }`, blocks as `AreaBlock` in `schema.ts` allows. No file: nothing changes |
| `sites/main/src/content/presets/` | Presets the site saved in Craeft's Edit, one file per kind of section |
| `backend/` | The contact form's Worker: stores enquiries (D1), checks Turnstile, hands them to Craeft to email |
| `tools/` | The checks: the URL contract and the SEO checks |
| `.craeft/old-site/` | Only on a site imported from an old website: how the old site looked (screenshots, colours, fonts), kept by Craeft for matching its design (the craeft-design skill). Never built or published |

## Rules

1. **Never break an address.** A page that moves or goes gets a line in `redirects.ts` and its entry
   in `url-contract.json` changes to `"expect": 301, "to": "/new-address"`. A new page is added to
   the contract on purpose (`pnpm build && pnpm contract`).
2. **Content is data.** Pages are blocks in YAML; what a block may contain is in
   `packages/theme/src/blocks/schema.ts`, and the build fails on anything else. After changing the
   schema, run `pnpm schema` (it writes `packages/theme/blocks.schema.json`, which editors read).
   A **free-form section** (`blockType: section`) is a layout of your own: `columns`
   (`{ desktop: 2, tablet: 2, phone: 1 }`, phones one column unless set), then `cells`, one per
   column, each with `elements` (heading, text, button, image, list, spacer, divider, video,
   gallery, map, testimonial, counter, accordion, tabs, form), e.g.
   `{ blockType: section, columns: { desktop: 2 }, cells: [{ elements: [{ element: heading, text: Our story }] }, { elements: [{ element: image, src: /media/team.jpg, alt: The team }] }] }`.
   Settings use the theme's steps (`s`, `m`, `l`, `xl`; tones `plain`, `white`, `tint`, `dark`).
   A **saved section** (`{ blockType: saved, id: book-a-call }`) is kept once in
   `sites/main/src/content/sections/<id>.yaml` (`name`, `block`) and used on several pages: to
   change it everywhere, change that file; to change it on one page only, replace the reference
   with a copy of its block.
3. **Facts only.** Prices, reviews, qualifications and claims must be true and the business's own.
   Sample text from the template is replaced before the site goes live.
4. **British English** (unless `locale` in site.config.ts says otherwise), plain words, short sentences.
5. Every page needs one heading (the hero's title), an SEO title (about 60 characters) and an SEO
   description (about 150 characters).
6. Images go in `sites/main/public/media/` with a description (`alt`) for people who can't see them.
7. The site's colours and fonts are in `sites/main/src/data/style.json` (hex colours; fonts from the
   theme's list in `packages/theme/src/site-config.ts`). The theme keeps text on any colour readable.
8. **The theme can change.** Its components (`packages/theme/src/blocks/`, `components/`,
   `layouts/`) and styles (`src/styles/global.css`, Tailwind classes) may be edited for a new look:
   an icon (`<Icon name="Target" />`, any Lucide name), a different layout for a block. A block's
   component draws that block on every page that has it; `variant`s and props keep a change to
   one place. Icons and images come from the site, never another website; the theme stays fast
   (no client JavaScript unless something needs it) and accessible (headings in order, alt text,
   readable contrast). New things in a block (a badge, cards, a row of logos) are new optional
   fields in `src/blocks/schema.ts`, drawn in the block's component and filled in on the page;
   then `pnpm schema` (Craeft runs it for its own edits). The theme's other `.ts` files (routes,
   SEO, content loading) are a developer's.

## Commands

```bash
pnpm install
pnpm dev            # the site at http://localhost:4321
pnpm dev:backend    # the form's backend at :8790 (copy backend/.dev.vars.example to backend/.dev.vars)
pnpm check          # types (Astro, the Workers)
pnpm verify:urls    # builds, serves it with Wrangler, checks every address in the contract
pnpm verify:seo     # titles, descriptions, canonicals, structured data, sitemap, robots.txt
pnpm verify         # all of the above: what the required `verify` check runs
```

## Craeft (the site editor)

Issue31 GitHub QA is edited with Craeft: people ask for a change in a sidebar on a preview of the site, and
an AI makes it on a draft branch (`edit-…`) within what `editor.json` allows. Publishing opens a
pull request into `main` and merges it only when the required checks pass.

- Keep `editor.json` in step with the site's folders and routes.
- The kit (`sites/main/worker/editor-kit.ts` next to the Worker entry, `sites/main/editor-build-info.ts`)
  comes from Craeft: update it from Craeft's repo, don't edit it here.
- Previews run with the `previews` block of `sites/main/wrangler.jsonc`; production never loads the editor.

## How it goes live

`main` is protected: changes arrive through pull (or merge) requests that pass `verify`. A green
`verify` on `main` fast-forwards `prod-main`, and Cloudflare Workers Builds deploys both Workers
from `prod-main`. Other branches get preview addresses.
