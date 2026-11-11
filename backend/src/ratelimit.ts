// A fixed-window rate limit in D1: at most `limit` requests per `windowSec` per bucket and address.
// Addresses are stored hashed, never as they are.
import { sha256 } from "./http";

export async function rateLimited(db: D1Database, bucket: string, ip: string, limit: number, windowSec: number): Promise<boolean> {
  const key = `${bucket}:${(await sha256(ip)).slice(0, 32)}`;
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare("SELECT count, window_start FROM rate_limits WHERE key = ?").bind(key).first<{ count: number; window_start: number }>();
  if (!row || now - row.window_start >= windowSec) {
    await db
      .prepare("INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start")
      .bind(key, now)
      .run();
    return false;
  }
  if (row.count >= limit) return true;
  await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
  return false;
}
