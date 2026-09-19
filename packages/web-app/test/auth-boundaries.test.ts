import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  load: vi.fn(),
  signOut: vi.fn(),
  register: vi.fn(),
  request: vi.fn(),
  headers: new Headers(),
}));
vi.mock("next/headers", () => ({
  headers: async () => mocks.headers,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("../lib/auth/server", () => ({
  auth: { api: { getSession: mocks.session, signOut: mocks.signOut } },
}));
vi.mock("../lib/auth/repository", () => ({
  loadUserWithRoles: mocks.load,
  registerRole: mocks.register,
}));
vi.mock("../lib/auth/request", () => ({ authRequest: mocks.request }));
import { requirePortalUser } from "../lib/auth/gate";
import { portals } from "../lib/auth/portals";
import { GET } from "../app/api/gate/reject/route";
import {
  completeRegistration,
  sendMagicLink,
  signUpWithPassword,
  signInWithPassword,
  resetPassword,
  requestPasswordReset,
} from "../lib/auth/actions";
import { APIError } from "better-auth/api";
const form = (data: Record<string, string>) => {
  const f = new FormData();
  Object.entries(data).forEach(([k, v]) => f.set(k, v));
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.headers = new Headers();
  mocks.session.mockResolvedValue({ user: { id: "user" } });
  mocks.load.mockResolvedValue({
    id: "user",
    status: "active",
    deletedAt: null,
    coach: null,
    coachee: null,
  });
});
it("redirects absent sessions to the portal login", async () => {
  mocks.session.mockResolvedValue(null);
  await expect(requirePortalUser(portals.coach)).rejects.toThrow(
    "REDIRECT:/pro/login",
  );
});
it("register gate only reads", async () => {
  await expect(requirePortalUser(portals.coach)).rejects.toThrow(
    "REDIRECT:/pro/login/welcome",
  );
  expect(mocks.register).not.toHaveBeenCalled();
  expect(mocks.signOut).not.toHaveBeenCalled();
  expect(mocks.session).toHaveBeenCalledWith(
    expect.objectContaining({ query: { disableRefresh: true } }),
  );
});
it("blocks cached session when database user is suspended", async () => {
  mocks.load.mockResolvedValue({
    status: "suspended",
    deletedAt: null,
    coach: {},
    coachee: null,
  });
  await expect(requirePortalUser(portals.coach)).rejects.toThrow(
    "REDIRECT:/api/gate/reject?portal=coach",
  );
});
it("sends the other role to the switch page and keeps the session", async () => {
  mocks.load.mockResolvedValue({
    id: "user",
    email: "jo@example.com",
    status: "active",
    deletedAt: null,
    coach: {},
    coachee: null,
  });
  await expect(requirePortalUser(portals.coachee)).rejects.toThrow(
    "REDIRECT:/login/switch",
  );
  await expect(requirePortalUser(portals.coach, "welcome")).rejects.toThrow(
    "REDIRECT:/pro",
  );
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it("switch page serves only a user who holds the other role", async () => {
  mocks.load.mockResolvedValue({
    id: "user",
    email: "jo@example.com",
    status: "active",
    deletedAt: null,
    coach: {},
    coachee: null,
  });
  await expect(
    requirePortalUser(portals.coachee, "switch"),
  ).resolves.toMatchObject({ email: "jo@example.com" });
  await expect(requirePortalUser(portals.coach, "switch")).rejects.toThrow(
    "REDIRECT:/pro",
  );
  mocks.load.mockResolvedValue({
    id: "user",
    status: "active",
    deletedAt: null,
    coach: null,
    coachee: null,
  });
  await expect(requirePortalUser(portals.coach, "switch")).rejects.toThrow(
    "REDIRECT:/pro/login/welcome",
  );
  mocks.session.mockResolvedValue(null);
  await expect(requirePortalUser(portals.coach, "switch")).rejects.toThrow(
    "REDIRECT:/pro/login",
  );
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it("signs out and forwards every cookie using validated destination", async () => {
  const headers = new Headers();
  headers.append("set-cookie", "a=; Max-Age=0; Path=/");
  headers.append("set-cookie", "b=; Max-Age=0; Path=/");
  mocks.signOut.mockResolvedValue(new Response(null, { headers }));
  const response = await GET(
    new Request(
      "https://holpro.app/api/gate/reject?portal=https://evil.com&reason=evil",
    ),
  );
  expect(response.headers.get("location")).toBe(
    "https://holpro.app/login?error=account_unavailable",
  );
  expect(response.headers.getSetCookie()).toHaveLength(2);
});
it("does not sign out on a cross-site or non-document request", async () => {
  for (const headers of [
    { "sec-fetch-site": "cross-site", "sec-fetch-dest": "document" },
    { "sec-fetch-site": "same-origin", "sec-fetch-dest": "image" },
  ]) {
    const response = await GET(
      new Request("https://holpro.app/api/gate/reject?portal=coach", {
        headers,
      }),
    );
    expect(response.headers.get("location")).toBe("https://holpro.app/");
    expect(response.headers.getSetCookie()).toHaveLength(0);
  }
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it("registration authenticates and invokes transactional policy", async () => {
  mocks.register.mockResolvedValue("reject");
  await expect(
    completeRegistration(
      "coach",
      {},
      form({ name: "Jo", timezone: "America/Lima" }),
    ),
  ).rejects.toThrow("REDIRECT:/pro/login/switch");
  expect(mocks.register).toHaveBeenCalledWith(
    "user",
    portals.coach,
    "Jo",
    "America/Lima",
    "en",
  );
});
it("registration without session cannot write", async () => {
  mocks.session.mockResolvedValue(null);
  await expect(
    completeRegistration("coach", {}, form({ name: "Jo" })),
  ).rejects.toThrow("REDIRECT:/pro/login");
  expect(mocks.register).not.toHaveBeenCalled();
});
it("magic link carries both callback destinations", async () => {
  await expect(
    sendMagicLink("coach", {}, form({ email: "jo@example.com" })),
  ).rejects.toThrow("/pro/login/sent?kind=magic");
  expect(mocks.request).toHaveBeenCalledWith(
    "/sign-in/magic-link",
    expect.objectContaining({
      callbackURL: "/pro",
      newUserCallbackURL: "/pro",
      errorCallbackURL: "/pro/login?error=link_invalid",
    }),
  );
});
it("duplicate signup is neutral", async () => {
  mocks.request.mockRejectedValue(
    new APIError("BAD_REQUEST", {
      code: "USER_ALREADY_EXISTS",
      message: "exists",
    }),
  );
  await expect(
    signUpWithPassword(
      "coach",
      {},
      form({ name: "Jo", email: "jo@example.com", password: "123456789012" }),
    ),
  ).rejects.toThrow("sent?kind=verify");
});
it("unverified login provides resend state", async () => {
  mocks.request.mockRejectedValue(
    new APIError("FORBIDDEN", {
      code: "EMAIL_NOT_VERIFIED",
      message: "verify",
    }),
  );
  expect(
    await signInWithPassword(
      "coach",
      {},
      form({ email: "jo@example.com", password: "123456789012" }),
    ),
  ).toEqual({
    error: "Verify your email first.",
    verifyEmail: "jo@example.com",
  });
});
it("rate limit is not swallowed by neutral success", async () => {
  mocks.request.mockRejectedValue(
    new APIError("TOO_MANY_REQUESTS", {
      code: "RATE_LIMITED",
      message: "slow",
    }),
  );
  expect(
    await requestPasswordReset("coach", {}, form({ email: "jo@example.com" })),
  ).toHaveProperty(
    "error",
    "Too many requests. Please wait a minute and try again.",
  );
});
it("mismatched reset passwords cannot reach auth", async () => {
  const state = await resetPassword(
    "coach",
    {},
    form({ token: "x", password: "123456789012", confirmPassword: "other" }),
  );
  expect(state.fields?.confirmPassword).toBeDefined();
  expect(mocks.request).not.toHaveBeenCalled();
});

it("translates field errors and stores the device locale during registration", async () => {
  mocks.headers.set("cookie", "hp_locale=es");
  const state = await completeRegistration("coach", {}, form({ name: "J" }));
  expect(state.fields?.name).toEqual(["Introduce al menos 2 caracteres."]);
  mocks.register.mockResolvedValue("enter");
  await expect(
    completeRegistration("coach", {}, form({ name: "Jo" })),
  ).rejects.toThrow("REDIRECT:/pro");
  expect(mocks.register).toHaveBeenCalledWith(
    "user",
    portals.coach,
    "Jo",
    "UTC",
    "es",
  );
});
