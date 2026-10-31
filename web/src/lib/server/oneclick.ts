// Server-only client for the NEAR Intents 1Click API. The partner key never reaches the browser.
const BASE = "https://1click.chaindefuser.com";

export class OneClickError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    path: string,
  ) {
    super(`1Click ${path} → ${status}`);
  }
}

export async function oneclick<T = unknown>(
  path: string,
  opts: { body?: unknown; userToken?: string; method?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ONECLICK_JWT) headers["X-API-Key"] = process.env.ONECLICK_JWT;
  if (opts.userToken) headers["Authorization"] = `Bearer ${opts.userToken}`;
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) throw new OneClickError(res.status, json, path);
  return json as T;
}

export type UserTokens = { accessToken: string; refreshToken: string; expiresIn: number; refreshExpiresIn: number };
