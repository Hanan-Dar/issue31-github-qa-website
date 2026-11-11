// Craeft site kit v8 (https://github.com/SameerBhat/craeft, plan/reference/architecture.md, the site kit).
// Copied into each site by `add-site`; don't edit the copy, edit packages/site-kit/editor-kit.ts and sync.
//
// Production builds (no EDITOR_ENABLED): /_editor/* answers 404 and everything else passes through
// untouched. Preview builds (the wrangler `previews` block sets EDITOR_ENABLED and the EDITOR
// binding): for requests that passed Cloudflare Access, HTML pages get the sidebar's loader and
// /_editor/* goes to the central editor with the user's Access token. The editor checks the token
// itself; this file decides nothing about who the user is.
//
// v2, live mode: when the sidebar sets the `se-live` cookie to a draft id, pages and assets come
// from that draft's live preview (its `astro dev` in the editor's container, plan/reference/architecture.md), so edits
// show in about a second. If it isn't running, the normal page is served and the cookie cleared.
// Files the live preview doesn't have (404: tmdb's media, left out of it) come from this build;
// a page it doesn't have is shown as its 404 (it was deleted in the draft). Only GET and HEAD go to
// the live preview (a form post stays with the site).
//
// v3, the front door: /admin (on the live site too) sends an admin to the editor, which signs them
// in with Cloudflare Access and opens this page with the sidebar. Once the editor has confirmed
// they're one of the site's editors, it sends them through /admin/ok, which leaves a "this browser
// has an admin" hint cookie (se-admin; not a credential, it only shows a link): pages for browsers
// with the hint get a small "Edit this page" button (/_editor/bar.js). Everyone else, including
// visitors who only tried /admin, gets the page exactly as before. /admin/hide removes the hint.
//
// v4, sites in their own Cloudflare account (decision 55): a service binding only works inside one
// account, so such a site sets EDITOR_URL (the gateway's address) in its previews block and
// the EDITOR_SITE_KEY secret instead of the EDITOR binding. Requests then go to the gateway over
// HTTPS with the key; everything else is the same.
//
// v5, Craeft: the editor's address comes from the site's EDITOR_ORIGIN var (set for production and
// previews), so moving the editor to another address is a var change, not a kit change; the
// fallback is Craeft's own address. Elements the kit adds carry `data-craeft` (was
// `data-site-editor`), which the sidebar and the screenshots ignore.
//
// v6: on previews, files other than build output (/_astro/*) are asked for again on every load, not
// kept for the week the site's `_headers` gives /media/* and /favicons/*: a draft's changed logo
// showed in the live preview only once the browser's copy ran out.
//
// v7: a redirect from the editor (the live preview following the draft's redirects.ts) is handed to
// the browser over the service binding too, as over HTTPS, not followed against the editor's address.
//
// v8, redirects for a connected site (a template site's Worker has its own): `withEditor(handler,
// { site, redirects })` answers the site's redirects.ts (its old addresses) before the site does,
// as the templates do: matched without a trailing slash, the first match wins, `to: null` is 410 Gone.
// Craeft's editor adds entries there when a page is renamed or deleted.
//
// v9, the front door's address (decision 107): `withEditor(handler, { site, door: "/craeft" })` for a
// site that has its own /admin. The kit then answers <door>, <door>/, <door>/ok and <door>/hide
// instead, and the Edit button goes there; Craeft's site settings must say the same door (the editor
// sends people back through <door>/ok). Without `door` it's /admin, as before.

//
// v10, hot updates in live mode (roadmap phase 20D): the dev server's WebSocket (a GET with
// `Upgrade: websocket`) goes to the editor like any live request, and its 101 answer straight back,
// so a style change shows without the page being fetched again. The editor turns hot updates on
// only for previews started from a v10 page.
//
// v11, uploaded videos (decision 135): a site with an R2 binding named MEDIA (a bucket in the site's
// own Cloudflare account) serves its files at /uploads/* (live site and previews alike), with byte
// ranges (a video's player asks for them) and a year's caching (each upload's name is new). On
// previews the sidebar uploads through /_editor/media/* in parts of up to 50 MB (R2's multipart
// upload): before each step the kit asks the editor whether this person may (POST
// /_editor/api/write/upload-grant, with their token), and the editor names the file. Craeft never
// holds a key to the site's account; the file goes straight from the browser into the site's bucket.
// Without MEDIA nothing changes (/_editor/media/status says uploads are off).

export const EDITOR_KIT_VERSION = 11;

/** Where uploads are served from (v11): /uploads/<name>, the R2 key without the leading slash. */
const UPLOADS = "/uploads/";
/** An upload's R2 key as the editor names it (v11). */
/** An upload part's size at most (v11): under a Worker request's 100 MB, over R2's 5 MiB minimum. */
const PART = 50 * 1024 * 1024;
const UPLOAD_KEY = /^uploads\/[a-z0-9][a-z0-9-]{0,80}-[a-z0-9]{8}\.[a-z0-9]{2,5}$/;

const EDITOR_ORIGIN = "https://app.craeft.org";
const ADMIN_HINT = /(?:^|;\s*)se-admin=1(?:;|$)/;
/** The front door unless the site names another (v9). */
const DEFAULT_DOOR = "/admin";
/** A door is one path segment: lower-case letters, digits and dashes ("/admin", "/craeft"). */
const DOOR = /^\/[a-z0-9][a-z0-9-]{0,39}$/;

/** A path on this site to come back to ("/", "/about?x=1"), or null (no other hosts). */
function safePath(p: string | null | undefined): string | null {
  if (!p || !p.startsWith("/") || p.startsWith("//") || p.includes("\\") || p.length > 500) return null;
  return /^[\x21-\x7e]+$/.test(p) ? p : null;
}

// The "Edit this page" button for browsers with the admin hint (live pages: no sidebar there).
const barJs = (door: string) => `(() => {
  if (window.top !== window || document.getElementById("se-admin-bar") || sessionStorage.getItem("se-bar-hidden")) return;
  const here = () => location.pathname + location.search;
  const bar = document.createElement("div");
  bar.id = "se-admin-bar";
  bar.setAttribute("data-craeft", "");
  bar.innerHTML = '<a href="#" data-go title="Open this page in Craeft (you sign in with Cloudflare Access)"><svg viewBox="8 10 88 90" width="14" height="14" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path fill="#ff6a00" d="M 79 12 H 42 C 22 12 10 27 10 46 C 10 63 20 75 32 79 L 32 94 C 32 97 35 98 38 95 L 55 81 H 74 C 86 81 92 72 92 62 C 92 58 89 56 85 56 H 49 C 45 56 42 58 39 61 L 39 68 L 35 64 L 35 55 C 27 51 25 44 29 36 C 32 30 37 29 45 29 H 79 C 91 29 94 23 94 20 C 94 15 89 12 79 12 Z"/></svg>Edit this page</a><button type="button" data-x title="Hide until next visit" aria-label="Hide">\\u00d7</button>';
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  Object.assign(bar.style, { position: "fixed", left: "16px", bottom: "16px", zIndex: "2147483646", display: "flex", alignItems: "center", gap: "2px", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: "999px", boxShadow: "0 6px 20px rgba(0,0,0,.25)", font: "600 13px/1 system-ui, -apple-system, sans-serif", padding: "4px", opacity: "0", transform: still ? "none" : "translateY(8px)", transition: still ? "opacity .2s" : "opacity .25s, transform .25s" });
  // Not on paper.
  const print = document.createElement("style");
  print.textContent = "@media print{#se-admin-bar{display:none!important}}";
  document.head.appendChild(print);
  const a = bar.querySelector("[data-go]");
  Object.assign(a.style, { color: "#fff", textDecoration: "none", padding: "8px 12px", borderRadius: "999px" });
  const x = bar.querySelector("[data-x]");
  Object.assign(x.style, { background: "transparent", color: "#a1a1aa", border: "0", font: "inherit", fontSize: "16px", padding: "6px 9px", borderRadius: "999px", cursor: "pointer" });
  a.addEventListener("mouseenter", () => { a.style.background = "#1e293b"; });
  a.addEventListener("mouseleave", () => { a.style.background = ""; });
  a.addEventListener("click", (e) => { e.preventDefault(); a.textContent = "Opening the editor\\u2026"; location.href = ${JSON.stringify(door)} + "?path=" + encodeURIComponent(here()); });
  x.addEventListener("click", () => { sessionStorage.setItem("se-bar-hidden", "1"); bar.remove(); });
  document.body.appendChild(bar);
  requestAnimationFrame(() => Object.assign(bar.style, { opacity: "1", transform: "none" }));
})();`;

const LIVE_COOKIE = /(?:^|;\s*)se-live=(edit-[a-z0-9]+)/;

/** An old address and where it goes now (v8); the same shape as a template site's redirects.ts. */
export interface RedirectRule {
  /** Exact path ("/home") or a pattern (/^\/blog\/(.+)$/). Matched against the path without a trailing slash. */
  from: string | RegExp;
  /** Where to; `$1`… are filled from a pattern's match. `null` answers 410 Gone. */
  to: string | null;
}

/** The answer to a request a redirect matches, or null. */
function redirectFor(rules: RedirectRule[], url: URL): Response | null {
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  for (const rule of rules) {
    let to: string | null;
    if (typeof rule.from === "string") {
      if (rule.from !== path) continue;
      to = rule.to;
    } else {
      if (!rule.from.test(path)) continue;
      to = rule.to === null ? null : path.replace(rule.from, rule.to);
    }
    if (to === null) return new Response("Gone", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    const target = new URL(to, url.origin);
    if (!target.search) target.search = url.search;
    return new Response(null, { status: 301, headers: { Location: target.pathname + target.search } });
  }
  return null;
}

export interface EditorKitEnv {
  ASSETS: Fetcher;
  /** "true" only in the wrangler `previews` block. */
  EDITOR_ENABLED?: string;
  /** Craeft's address (production and previews vars); falls back to https://app.craeft.org. */
  EDITOR_ORIGIN?: string;
  /** Service binding to the editor Worker's SiteGateway entrypoint (previews block only; same account). */
  EDITOR?: Fetcher;
  /** Or, for a site in its own Cloudflare account: the gateway's address and this site's key (secret). */
  EDITOR_URL?: string;
  EDITOR_SITE_KEY?: string;
  /** v11: the site's R2 bucket for uploaded videos (served at /uploads/*). */
  MEDIA?: R2Bucket;
}

/** An uploaded file from the site's bucket (v11): byte ranges, conditional requests, a year's caching. */
async function serveUpload(req: Request, bucket: R2Bucket, key: string): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD")
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  const range = req.headers.has("Range") ? req.headers : undefined;
  const obj = await bucket.get(key, { range, onlyIf: req.headers });
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", obj.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  // Not modified (onlyIf matched no body).
  if (!("body" in obj)) return new Response(null, { status: 304, headers });
  const r = obj.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (range && r) {
    const offset = r.suffix !== undefined ? obj.size - r.suffix : (r.offset ?? 0);
    const length = r.suffix !== undefined ? r.suffix : (r.length ?? obj.size - offset);
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("Content-Length", String(length));
    return new Response(req.method === "HEAD" ? null : obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(obj.size));
  return new Response(req.method === "HEAD" ? null : obj.body, { headers });
}

let buildInfo: { branch: string; commit: string } | undefined;

async function readBuildInfo(env: EditorKitEnv) {
  if (buildInfo) return buildInfo;
  try {
    const r = await env.ASSETS.fetch(new Request("https://assets.local/_editor/build.json"));
    buildInfo = r.ok ? ((await r.json()) as { branch: string; commit: string }) : { branch: "", commit: "" };
  } catch {
    buildInfo = { branch: "", commit: "" };
  }
  return buildInfo;
}

function accessToken(req: Request): string | null {
  const h = req.headers.get("Cf-Access-Jwt-Assertion");
  if (h) return h;
  const m = (req.headers.get("Cookie") ?? "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const attr = (s: string) => s.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);

/** Adds 'self' to frame-src (the sidebar is a same-origin iframe). */
function relaxCsp(csp: string): string {
  return csp
    .split(";")
    .map((d) => {
      const t = d.trim();
      if (/^frame-src\b/i.test(t) && !t.includes("'self'")) return ` ${t} 'self'`;
      return d;
    })
    .join(";");
}

export function withEditor<E extends EditorKitEnv>(
  handler: ExportedHandler<E>,
  opts: { site: string; editorOrigin?: string; redirects?: RedirectRule[]; door?: string },
): ExportedHandler<E> {
  const inner = handler.fetch;
  if (!inner) throw new Error("withEditor needs a handler with fetch");
  const door = opts.door ?? DEFAULT_DOOR;
  if (!DOOR.test(door)) throw new Error(`withEditor: door must be like "/craeft", not ${JSON.stringify(door)}`);
  const BAR_JS = barJs(door);
  return {
    async fetch(req, env, ctx) {
      const url = new URL(req.url);
      // The editor, by service binding (same account) or over HTTPS with the site's key (v4).
      const remote = !env.EDITOR && !!env.EDITOR_URL && !!env.EDITOR_SITE_KEY;
      const enabled = env.EDITOR_ENABLED === "true" && (!!env.EDITOR || remote);
      const cookie = req.headers.get("Cookie") ?? "";

      // The front door (live site and previews alike; /admin unless the site names another). <door>/ok
      // is where the editor sends someone it has confirmed is an editor: the hint is set there, then
      // on to the editor again (ok=1).
      if (url.pathname === door || url.pathname === `${door}/` || url.pathname === `${door}/ok`) {
        const back = safePath(url.searchParams.get("path")) ?? "/";
        const ok = url.pathname === `${door}/ok`;
        const to = `${opts.editorOrigin ?? env.EDITOR_ORIGIN ?? EDITOR_ORIGIN}/open/${encodeURIComponent(opts.site)}?path=${encodeURIComponent(back)}${ok ? "&ok=1" : ""}`;
        const headers: Record<string, string> = { Location: to, "Cache-Control": "no-store" };
        if (ok) headers["Set-Cookie"] = "se-admin=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax";
        // The first time in this browser: a moment to say what comes next (Cloudflare's sign-in page
        // would otherwise appear out of nowhere), then on by itself. No script: a meta refresh.
        if (!ok && !ADMIN_HINT.test(cookie)) {
          const host = attr(url.host.replace(/^www\./, ""));
          const go = attr(to);
          const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="2;url=${go}"><title>Opening Craeft</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8f7f4;color:#0f172a;font:16px/1.6 system-ui,-apple-system,sans-serif}main{max-width:420px;margin:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;box-shadow:0 8px 28px rgba(15,23,42,.06)}
.m{width:28px;height:28px;color:#ff6a00}h1{font-size:20px;margin:6px 0}p{margin:8px 0;color:#475569}a{display:inline-block;margin-top:10px;background:#ff6a00;color:#0f172a;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px}a:hover{background:#e85e00}a:focus-visible{outline:3px solid #b74700;outline-offset:3px}
.bar{height:3px;background:#fff1e6;border-radius:3px;overflow:hidden;margin-top:16px}.bar i{display:block;height:100%;width:0;background:#ff6a00;animation:g 2s linear forwards}@keyframes g{to{width:100%}}
@media (prefers-reduced-motion:reduce){.bar i{animation:none;width:100%}}</style>
<main><svg class="m" viewBox="8 10 88 90" aria-hidden="true"><path fill="currentColor" d="M 79 12 H 42 C 22 12 10 27 10 46 C 10 63 20 75 32 79 L 32 94 C 32 97 35 98 38 95 L 55 81 H 74 C 86 81 92 72 92 62 C 92 58 89 56 85 56 H 49 C 45 56 42 58 39 61 L 39 68 L 35 64 L 35 55 C 27 51 25 44 29 36 C 32 30 37 29 45 29 H 79 C 91 29 94 23 94 20 C 94 15 89 12 79 12 Z"/></svg><h1>Opening Craeft</h1><p>This is where the people who look after <b>${host}</b> sign in to change it.</p><p>Cloudflare will ask for your email and send you a one-time code. Then you'll see this page with the editor beside it.</p><a href="${go}">Continue</a><div class="bar"><i></i></div></main></html>`;
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
          });
        }
        return new Response(null, { status: 302, headers });
      }
      if (url.pathname === `${door}/hide`) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: safePath(url.searchParams.get("path")) ?? "/",
            "Set-Cookie": "se-admin=; Path=/; Max-Age=0; Secure; SameSite=Lax",
            "Cache-Control": "no-store",
          },
        });
      }
      if (url.pathname === "/_editor/bar.js" && !enabled) {
        return new Response(BAR_JS, {
          headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      }

      // Uploaded videos (v11), on the live site and previews alike.
      if (env.MEDIA && url.pathname.startsWith(UPLOADS)) {
        const key = decodeURIComponent(url.pathname.slice(1));
        if (!UPLOAD_KEY.test(key)) return new Response("Not found", { status: 404 });
        const res = await serveUpload(req, env.MEDIA, key);
        // Previews: asked for again on every load (v6), as the site's other files.
        if (enabled && accessToken(req)) res.headers.set("Cache-Control", "private, no-cache");
        return res;
      }

      /**
       * Forwards a request to the editor, with the user's token and this build's details. `send`
       * replaces the request's own method and body (v11: an upload's grant, without the video).
       */
      const toEditor = async (
        target: URL,
        token: string | null,
        extra: Record<string, string> = {},
        send?: { method: string; body: string },
      ) => {
        const build = await readBuildInfo(env);
        const headers = new Headers();
        for (const h of ["Content-Type", "Accept", "Accept-Language", "Sec-Fetch-Site", "If-None-Match", "If-Modified-Since"]) {
          const v = req.headers.get(h);
          if (v) headers.set(h, v);
        }
        // A WebSocket (v10: the live preview's hot updates) keeps what makes it one.
        if (req.headers.get("Upgrade")?.toLowerCase() === "websocket")
          for (const h of [
            "Upgrade",
            "Connection",
            "Sec-WebSocket-Key",
            "Sec-WebSocket-Version",
            "Sec-WebSocket-Protocol",
            "Sec-WebSocket-Extensions",
          ]) {
            const v = req.headers.get(h);
            if (v) headers.set(h, v);
          }
        headers.set("X-Editor-Site", opts.site);
        headers.set("X-Editor-Kit", String(EDITOR_KIT_VERSION));
        if (token) headers.set("X-Editor-Access-Token", token);
        headers.set("X-Editor-Build-Branch", build.branch);
        headers.set("X-Editor-Build-Commit", build.commit);
        for (const [k, v] of Object.entries(extra)) headers.set(k, v);
        const method = send?.method ?? req.method;
        const body = send ? send.body : method !== "GET" && method !== "HEAD" ? req.body : undefined;
        if (send) headers.set("Content-Type", "application/json");
        if (remote) {
          headers.set("X-Editor-Site-Key", env.EDITOR_SITE_KEY!);
          const to = new URL(target.pathname + target.search, env.EDITOR_URL);
          return fetch(new Request(to.toString(), { method, headers, body, redirect: "manual" }));
        }
        return env.EDITOR!.fetch(new Request(target.toString(), { method, headers, body, redirect: "manual" }));
      };

      /** The editor's yes or no to an upload step (v11), with the file's name when it's a yes. */
      const grant = async (token: string, ask: Record<string, unknown>) => {
        const r = await toEditor(new URL("/_editor/api/write/upload-grant", url), token, {}, { method: "POST", body: JSON.stringify(ask) });
        const out = (await r.json().catch(() => ({}))) as { key?: string; error?: { message?: string } | string };
        return { ok: r.ok, status: r.status, key: out.key, answer: out };
      };
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

      /** /_editor/media/*: status, list, start, part, complete, abort (v11). */
      const uploadStep = async (url: URL, token: string): Promise<Response> => {
        const step = url.pathname.slice("/_editor/media/".length);
        const bucket = env.MEDIA;
        if (step === "status") return json({ uploads: !!bucket, maxPart: PART });
        if (!bucket) return json({ error: { message: "This site has no bucket for uploads (an R2 binding named MEDIA)." } }, 409);
        const q = url.searchParams;
        if (step === "list" && req.method === "GET") {
          const g = await grant(token, { step: "list" });
          if (!g.ok) return json(g.answer, g.status);
          const listed = await bucket.list({ prefix: "uploads/", limit: 500, include: ["httpMetadata"] });
          const files = listed.objects
            .map((o) => ({ url: `/${o.key}`, size: o.size, type: o.httpMetadata?.contentType ?? "", uploaded: o.uploaded.toISOString() }))
            .sort((a, b) => b.uploaded.localeCompare(a.uploaded));
          return json({ files });
        }
        if (step === "start" && req.method === "POST") {
          const ask = (await req.json().catch(() => ({}))) as { name?: string; type?: string; size?: number };
          const g = await grant(token, { step: "start", name: ask.name, type: ask.type, size: ask.size });
          if (!g.ok || !g.key || !UPLOAD_KEY.test(g.key)) return json(g.answer, g.ok ? 502 : g.status);
          const up = await bucket.createMultipartUpload(g.key, { httpMetadata: { contentType: String(ask.type) } });
          return json({ key: up.key, uploadId: up.uploadId, url: `/${up.key}`, partSize: PART });
        }
        const key = q.get("key") ?? "";
        const uploadId = q.get("uploadId") ?? "";
        if (!UPLOAD_KEY.test(key) || !uploadId) return json({ error: { message: "Which upload?" } }, 400);
        if (step === "part" && req.method === "PUT") {
          const n = Number(q.get("n"));
          const size = Number(req.headers.get("Content-Length"));
          if (!Number.isInteger(n) || n < 1 || n > 10000 || !req.body) return json({ error: { message: "Bad part" } }, 400);
          if (!size || size > PART) return json({ error: { message: `A part is at most ${PART} bytes, with its length.` } }, 413);
          const g = await grant(token, { step: "part", key });
          if (!g.ok) return json(g.answer, g.status);
          const part = await bucket.resumeMultipartUpload(key, uploadId).uploadPart(n, req.body);
          return json({ partNumber: part.partNumber, etag: part.etag });
        }
        if (step === "complete" && req.method === "POST") {
          const { parts } = (await req.json().catch(() => ({}))) as { parts?: { partNumber: number; etag: string }[] };
          if (!Array.isArray(parts) || !parts.length) return json({ error: { message: "No parts" } }, 400);
          const g = await grant(token, { step: "complete", key });
          if (!g.ok) return json(g.answer, g.status);
          const obj = await bucket.resumeMultipartUpload(key, uploadId).complete(parts);
          return json({ url: `/${obj.key}`, size: obj.size });
        }
        if (step === "abort" && req.method === "POST") {
          const g = await grant(token, { step: "abort", key });
          if (!g.ok) return json(g.answer, g.status);
          await bucket.resumeMultipartUpload(key, uploadId).abort();
          return json({ ok: true });
        }
        return json({ error: { message: "Not found" } }, 404);
      };

      if (url.pathname === "/_editor" || url.pathname.startsWith("/_editor/")) {
        if (!enabled) return new Response("Not found", { status: 404 });
        const token = accessToken(req);
        // The sidebar's static files need no token; the API does (checked by the editor).
        if (!token && !url.pathname.startsWith("/_editor/ui/")) return new Response("Not signed in", { status: 401 });
        if (url.pathname.startsWith("/_editor/media/")) return uploadStep(url, token!);
        return toEditor(url, token);
      }

      // The site's redirects (v8), on the live site and previews alike.
      const moved = opts.redirects?.length ? redirectFor(opts.redirects, url) : null;
      if (moved) return moved;

      const token = enabled ? accessToken(req) : null;
      const readOnly = req.method === "GET" || req.method === "HEAD";
      const liveDraft = token && readOnly ? ((req.headers.get("Cookie") ?? "").match(LIVE_COOKIE)?.[1] ?? null) : null;
      let res: Response | null = null;
      let clearLive = false;
      if (liveDraft) {
        const r = await toEditor(new URL(`/_editor/live${url.pathname}${url.search}`, url), token, { "X-Editor-Live-Draft": liveDraft });
        // The hot-update socket, as it is (wrapping a 101 would break it).
        if (r.status === 101) return r;
        if (r.status === 424) clearLive = true;
        else if (r.status === 404 && !(req.headers.get("Accept") ?? "").includes("text/html")) await r.body?.cancel();
        else res = r;
      }
      // A page for a browser with the hint: ask for the whole page, not "not modified" (a 304 has no
      // body to add the button to, and the browser's cached copy may be from before the hint).
      const hinted = !enabled && ADMIN_HINT.test(cookie) && req.method === "GET" && (req.headers.get("Accept") ?? "").includes("text/html");
      if (hinted && (req.headers.has("If-None-Match") || req.headers.has("If-Modified-Since"))) {
        const headers = new Headers(req.headers);
        headers.delete("If-None-Match");
        headers.delete("If-Modified-Since");
        req = new Request(req, { headers }) as typeof req;
      }
      res ??= await inner(req, env, ctx);
      // The live site: the "Edit this page" button, only for browsers with the admin hint.
      if (!enabled) {
        if (!ADMIN_HINT.test(cookie) || req.method !== "GET" || !(res.headers.get("Content-Type") ?? "").includes("text/html")) return res;
        const out = new HTMLRewriter()
          .on("body", {
            element(el) {
              el.append('<script src="/_editor/bar.js" defer data-craeft></script>', { html: true });
            },
          })
          .transform(res);
        const headers = new Headers(out.headers);
        // A page with the button is this browser's own: never stored by a shared cache.
        headers.set("Cache-Control", "private, no-store");
        headers.append("Vary", "Cookie");
        return new Response(out.body, { status: out.status, statusText: out.statusText, headers });
      }
      if (!token) return res;
      if (clearLive) {
        res = new Response(res.body, res);
        res.headers.append("Set-Cookie", "se-live=; Path=/; Max-Age=0; Secure; SameSite=Lax");
      }
      if (!(res.headers.get("Content-Type") ?? "").includes("text/html")) {
        // A picture, the logo or a font keeps its name when a draft changes it: asked for again on
        // every load, not kept for the week `_headers` gives it (or the live preview's change never
        // shows). Build output names change with their content.
        if (url.pathname.startsWith("/_astro/")) return res;
        res = new Response(res.body, res);
        res.headers.set("Cache-Control", "private, no-cache");
        return res;
      }

      const build = await readBuildInfo(env);
      const live = liveDraft && !clearLive ? ` data-live="${attr(liveDraft)}"` : "";
      const tag = `<script type="module" src="/_editor/ui/loader.js" data-site="${attr(opts.site)}" data-branch="${attr(build.branch)}" data-commit="${attr(build.commit)}"${live}></script>`;
      const out = new HTMLRewriter()
        .on("body", {
          element(el) {
            el.append(tag, { html: true });
          },
        })
        .transform(res);
      const headers = new Headers(out.headers);
      headers.set("Cache-Control", "no-store");
      const csp = headers.get("Content-Security-Policy");
      if (csp) headers.set("Content-Security-Policy", relaxCsp(csp));
      const pp = headers.get("Permissions-Policy");
      if (pp) headers.set("Permissions-Policy", pp.replace(/microphone=\(\)/, "microphone=(self)"));
      return new Response(out.body, { status: out.status, statusText: out.statusText, headers });
    },
  };
}
