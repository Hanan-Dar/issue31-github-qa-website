export const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const clientIp = (req: Request) => req.headers.get("CF-Connecting-IP") ?? "0.0.0.0";

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A trimmed string of at most `max` characters ("" for anything else). */
export const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
