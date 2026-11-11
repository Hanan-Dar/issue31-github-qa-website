// The site Worker. It runs before the static files except the build's hashed ones (run_worker_first in
// sites/main/wrangler.jsonc) and only does URL work, every redirect in ONE hop:
//   1. redirects from the site's redirects.ts (old addresses), with or without a trailing slash
//   2. /api/* → the backend Worker (the contact form), through its service binding
//   3. a trailing slash → 301 to the address without it
// Everything else is a plain static file.

export interface RedirectRule {
  /** Exact path ("/home") or a pattern (/^\/blog\/(.+)$/). Matched against the path without a trailing slash. */
  from: string | RegExp;
  /** Where to; `$1`… are filled from a pattern's match. `null` answers 410 Gone. */
  to: string | null;
}

interface Env {
  ASSETS: Fetcher;
  BACKEND?: Fetcher;
}

function redirect(url: URL, path: string): Response {
  const target = new URL(path, url.origin);
  if (!target.search) target.search = url.search;
  return new Response(null, { status: 301, headers: { Location: target.pathname + target.search } });
}

export function matchRedirect(rules: RedirectRule[], path: string): { to: string | null } | undefined {
  for (const rule of rules) {
    if (typeof rule.from === "string") {
      if (rule.from === path) return { to: rule.to };
      continue;
    }
    const m = rule.from.exec(path);
    if (m) return { to: rule.to === null ? null : path.replace(rule.from, rule.to) };
  }
  return undefined;
}

export function createSiteWorker({ redirects }: { redirects: RedirectRule[] }): ExportedHandler<Env> {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const raw = url.pathname;
      const path = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;

      const hit = matchRedirect(redirects, path);
      if (hit) return hit.to === null ? new Response("Gone", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } }) : redirect(url, hit.to);

      if (path === "/api" || path.startsWith("/api/")) {
        // Previews have no backend on purpose: a form sent from a preview can't reach the inbox.
        if (!env.BACKEND) return Response.json({ error: "The form doesn't work on previews." }, { status: 503 });
        return env.BACKEND.fetch(request);
      }

      if (path !== raw) return redirect(url, path);
      return env.ASSETS.fetch(request);
    },
  };
}
