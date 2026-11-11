// Turnstile's server-side check (Siteverify). It fails CLOSED: with no secret set, every enquiry is
// refused and an error is logged, so a missing `wrangler secret put TURNSTILE_SECRET_KEY` shows up
// as a form that doesn't work rather than a form without spam protection. For `pnpm dev:backend`,
// .dev.vars sets Cloudflare's always-pass test secret.
export async function verifyTurnstile(secret: string | undefined, token: string, ip: string): Promise<boolean> {
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set; refusing the enquiry");
    return false;
  }
  if (!token) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  body.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("[turnstile] refused", data["error-codes"]);
    return Boolean(data.success);
  } catch (e) {
    console.error("[turnstile] siteverify unreachable", e);
    return false;
  }
}
