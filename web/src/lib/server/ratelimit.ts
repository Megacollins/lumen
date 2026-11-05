// Per-IP rate limits and a short quote cache, in memory.
// Each Vercel instance keeps its own counters, so this stops floods from one source rather than enforcing a strict
// global cap; a shared store (e.g. Upstash Redis) would make it exact across instances.

const hits = new Map<string, number[]>();
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

/** The caller's IP as Vercel reports it (first x-forwarded-for hop), or "local" in development. */
export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

/** Limits per IP per minute, by route group. */
export const LIMITS = {
  quote: 40,
  auth: 30,
  demo: 10,
  execute: 20,
  read: 120,
  write: 20,
} as const;

/** Returns a 429 response when this IP has used up `group`'s allowance for the last minute, otherwise null. */
export function rateLimit(req: Request, group: keyof typeof LIMITS): Response | null {
  const now = Date.now();
  const key = `${group}:${clientIp(req)}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= LIMITS[group]) {
    const retry = Math.ceil((60_000 - (now - recent[0])) / 1000);
    return Response.json({ error: "Too many requests. Wait a moment and try again." }, { status: 429, headers: { "Retry-After": String(retry) } });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (now - v[v.length - 1] > 60_000) hits.delete(k);
  return null;
}

/** Runs `fn` once per `key` per `ttlMs`; concurrent callers share the same promise. Failures aren't cached. */
export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn();
  cache.set(key, { at: now, value });
  value.catch(() => cache.delete(key));
  if (cache.size > 2_000) for (const [k, v] of cache) if (now - v.at > ttlMs) cache.delete(k);
  return value;
}
