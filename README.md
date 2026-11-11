# Issue31 GitHub QA

The website of Issue31 GitHub QA, made with [Craeft](https://craeft.org) and edited there.

- **Change the content:** in Craeft, or in `sites/main/src/content/` (pages and posts) and
  `sites/main/site.config.ts` (contact details, opening hours, colours, fonts, logo).
- **Run it locally:** `pnpm install && pnpm dev`, then open http://localhost:4321.
- **Before a change goes live:** `pnpm verify` (the same check that runs on every pull request).

How the site is put together and the rules for changing it: [AGENTS.md](AGENTS.md).

## Hosting

Two Cloudflare Workers, built and deployed by Workers Builds from the `prod-main` branch:

- `issue31-github-qa-www`: the site (`sites/main`), static pages plus redirects;
- `issue31-github-qa-www-backend`: the contact form (`backend`), its enquiries in a D1 database.

Its secrets are set with `wrangler secret put` in `backend/`: `TURNSTILE_SECRET_KEY` (spam
protection) and `FORMS_KEY` (signs the hand-off of each enquiry to Craeft, which emails it on).
