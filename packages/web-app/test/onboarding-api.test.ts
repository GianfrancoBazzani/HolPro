import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  session: vi.fn(),
  retry: vi.fn(),
  subscribe: vi.fn(),
  read: vi.fn(),
  list: vi.fn(async () => []),
  inbox: vi.fn(async () => []),
}));
vi.mock("../lib/assistant/session", () => ({
  requireAssistantUser: f.session,
  unauthorized: () => new Response(null, { status: 401 }),
  invalidInput: () => new Response(null, { status: 400 }),
}));
vi.mock("../lib/onboarding/repository", () => ({
  listOnboarding: f.list,
  retryOnboarding: f.retry,
}));
vi.mock("../lib/notifications/repository", () => ({
  listNotifications: f.inbox,
  hasPushSubscription: vi.fn(async () => false),
  markNotificationRead: f.read,
  savePushSubscription: f.subscribe,
  removePushSubscription: vi.fn(),
}));
vi.mock("../lib/notifications/push-input", async (original) => ({
  ...(await original<object>()),
  pushPublicKey: () => "public",
}));
vi.mock("../lib/auth/portals", () => ({ baseURL: "https://holpro.test" }));
import { GET, POST } from "../app/api/onboarding/route";
beforeEach(() => {
  vi.clearAllMocks();
  f.session.mockResolvedValue({
    user: { id: "signed-in" },
    sessionId: "session",
    role: "coachee",
  });
});
const request = (body: unknown, origin = "https://holpro.test") =>
  new Request("https://holpro.test/api/onboarding", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
it("rejects unsigned readers and cross-origin writes", async () => {
  f.session.mockResolvedValue(null);
  expect(
    (await GET(new Request("https://holpro.test/api/onboarding"))).status,
  ).toBe(401);
  expect(
    (
      await POST(
        request(
          { action: "retry", id: crypto.randomUUID() },
          "https://attacker.test",
        ),
      )
    ).status,
  ).toBe(403);
});
it("uses the session identity for retries and ignores supplied user identity", async () => {
  const id = crypto.randomUUID();
  expect(
    (await POST(request({ action: "retry", id, userId: "victim" }))).status,
  ).toBe(200);
  expect(f.retry).toHaveBeenCalledWith(
    { userId: "signed-in", role: "coachee" },
    id,
  );
});
it("bounds chunked request bodies and rejects private push endpoints", async () => {
  expect(
    (
      await POST(
        request({
          action: "subscribe",
          subscription: {
            endpoint: "https://127.0.0.1/x",
            keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) },
          },
        }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request({ data: "x".repeat(9000) }))).status).toBe(413);
  expect(f.subscribe).not.toHaveBeenCalled();
});
it("returns only the signed-in user's inbox and disables caching", async () => {
  const response = await GET(new Request("https://holpro.test/api/onboarding"));
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(f.inbox).toHaveBeenCalledWith("signed-in");
});
