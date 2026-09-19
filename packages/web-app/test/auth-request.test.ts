import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ handler: vi.fn(), set: vi.fn() }));
vi.mock("../lib/auth/server", () => ({ auth: { handler: mocks.handler } }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      cookie: "session=old",
      origin: "http://localhost:3000",
      "x-forwarded-for": "192.0.2.1",
    }),
  cookies: async () => ({ set: mocks.set }),
}));
import { authRequest } from "../lib/auth/request";
beforeEach(() => vi.resetAllMocks());
it("uses HTTP rate-limit boundary and preserves cookie attributes", async () => {
  const headers = new Headers();
  headers.append(
    "set-cookie",
    "session=new; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800",
  );
  headers.append(
    "set-cookie",
    "cache=new; Path=/; HttpOnly; SameSite=Lax; Max-Age=300",
  );
  mocks.handler.mockResolvedValue(new Response("{}", { headers }));
  await authRequest("/sign-in/email", {
    email: "jo@example.com",
    password: "test-password",
  });
  const request = mocks.handler.mock.calls[0][0] as Request;
  expect(request.url).toBe("http://localhost:3000/api/auth/sign-in/email");
  expect(request.headers.get("x-forwarded-for")).toBe("192.0.2.1");
  expect(request.headers.get("cookie")).toBe("session=old");
  expect(mocks.set).toHaveBeenCalledWith(
    "session",
    "new",
    expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 604800,
      path: "/",
    }),
  );
  expect(mocks.set).toHaveBeenCalledTimes(2);
});
it("turns handler 429 into a rate-limit error", async () => {
  mocks.handler.mockResolvedValue(new Response("{}", { status: 429 }));
  await expect(authRequest("/sign-in/email", {})).rejects.toMatchObject({
    status: "TOO_MANY_REQUESTS",
    body: { code: "RATE_LIMITED" },
  });
});
