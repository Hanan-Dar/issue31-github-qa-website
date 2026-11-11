// The site's backend: the contact form. The site Worker passes /api/* here through its service
// binding (this Worker has no public address of its own).
//   POST /api/enquiry  JSON { name, email, phone, message, consent, website, token, page }
// Each enquiry is checked (rate limit, honeypot, Turnstile, fields), stored in D1 first, and only
// then handed on to be emailed (waitUntil), so nothing is lost if the email side is down.
import type { Env } from "./env";
import { handOff } from "./handoff";
import { clientIp, clip, EMAIL, json } from "./http";
import { rateLimited } from "./ratelimit";
import { verifyTurnstile } from "./turnstile";

async function enquiry(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const ip = clientIp(req);
  if (await rateLimited(env.DB, "enquiry", ip, 5, 600)) return json(429, { error: "Too many messages. Please try again in a few minutes." });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return json(400, { error: "Invalid request." });
  // Honeypot: say it worked, so bots learn nothing.
  if (clip(body.website, 200)) return json(200, { ok: true });
  if (!(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, clip(body.token, 4096), ip)))
    return json(400, { error: "The security check didn't pass. Please try again." });

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const message = clip(body.message, 5000);
  if (!name) return json(400, { error: "Please tell us your name." });
  if (!EMAIL.test(email)) return json(400, { error: "Please enter a valid email address." });
  if (!message) return json(400, { error: "Please write a message." });
  if (body.consent !== true) return json(400, { error: "Please tick the box so we can reply to you." });

  const row = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name,
    email,
    phone: clip(body.phone, 40) || undefined,
    message,
    page: clip(body.page, 300) || undefined,
  };
  await env.DB.prepare("INSERT INTO enquiries (id, created_at, name, email, phone, message, page, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(row.id, row.createdAt, name, email, row.phone ?? null, message, row.page ?? null, clip(req.headers.get("User-Agent"), 300) || null)
    .run();
  ctx.waitUntil(
    handOff(env, row).then((error) =>
      env.DB.prepare("UPDATE enquiries SET sent_at = ?, send_error = ? WHERE id = ?")
        .bind(error ? null : new Date().toISOString(), error, row.id)
        .run(),
    ),
  );
  return json(200, { ok: true });
}

export default {
  async fetch(req, env, ctx): Promise<Response> {
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    try {
      if (path === "/api/enquiry" && req.method === "POST") return await enquiry(req, env, ctx);
      return json(404, { error: "Not found." });
    } catch (e) {
      console.error("[backend] unhandled", e);
      return json(500, { error: "Something went wrong. Please try again, or email us." });
    }
  },
} satisfies ExportedHandler<Env>;
