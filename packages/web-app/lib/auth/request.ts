import { cookies, headers } from "next/headers";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { APIError } from "better-auth/api";
import { auth } from "./server";
import { baseURL } from "./portals";
// Better Auth applies its database rate limits only in the HTTP handler, so
// Server Actions go through the handler instead of auth.api.*.
export async function authRequest(path: string, body: Record<string, unknown>) {
  const incoming = await headers();
  const outgoing = new Headers({ "content-type": "application/json" });
  for (const key of ["cookie", "x-forwarded-for", "user-agent", "origin"]) {
    const value = incoming.get(key);
    if (value) outgoing.set(key, value);
  }
  const response = await auth.handler(
    new Request(new URL(`/api/auth${path}`, baseURL), {
      method: "POST",
      headers: outgoing,
      body: JSON.stringify(body),
    }),
  );
  const store = await cookies();
  for (const cookie of response.headers.getSetCookie())
    for (const [name, value] of parseSetCookieHeader(cookie))
      store.set(name, value.value, toCookieOptions(value));
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      code?: string;
    };
    const limited = response.status === 429;
    throw new APIError(limited ? "TOO_MANY_REQUESTS" : "BAD_REQUEST", {
      code: error.code ?? (limited ? "RATE_LIMITED" : "UNKNOWN"),
      message: "Authentication request failed",
    });
  }
}
