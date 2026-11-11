// Hands a stored enquiry to Craeft's gateway (POST /forms/enquiry), which emails it from
// forms@notify.craeft.org to the inbox Craeft keeps for the site (the one chosen when it was made:
// FORM_INBOX here is only for this site's own records). The request is JSON { site, enquiry },
// signed with HMAC-SHA256 over "<timestamp>.<body>" in X-Craeft-Signature with FORMS_KEY, the
// secret Craeft set on this Worker; the gateway refuses old timestamps. Until FORMS_KEY is set,
// enquiries are only stored in D1, and this says so.
import type { Env } from "./env";

export type Enquiry = { id: string; createdAt: string; name: string; email: string; phone?: string; message: string; page?: string };

async function sign(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sends the enquiry on; returns null when it went, else why not (stored in enquiries.send_error). */
export async function handOff(env: Env, enquiry: Enquiry): Promise<string | null> {
  if (!env.FORMS_KEY || !env.GATEWAY_URL) {
    console.log("[handoff] not set up yet (FORMS_KEY): enquiry stored only", enquiry.id);
    return "not set up";
  }
  const body = JSON.stringify({ site: env.SITE_ID, enquiry });
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(new URL("/forms/enquiry", env.GATEWAY_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Craeft-Timestamp": timestamp,
        "X-Craeft-Signature": await sign(env.FORMS_KEY, `${timestamp}.${body}`),
      },
      body,
    });
    if (res.ok) return null;
    console.error("[handoff] gateway answered", res.status);
    return `gateway ${res.status}`;
  } catch (e) {
    console.error("[handoff] gateway unreachable", e);
    return "gateway unreachable";
  }
}
