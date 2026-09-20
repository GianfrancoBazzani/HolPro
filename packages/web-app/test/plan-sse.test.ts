import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/assistant/session", () => ({
  requireAssistantUser: vi.fn(),
  unauthorized: () => Response.json({ error: "unauthorized" }, { status: 401 }),
}));
vi.mock("../lib/plans/repository", () => ({
  canReadPlans: vi.fn(async () => true),
}));
import { requireAssistantUser } from "../lib/assistant/session";
import { canReadPlans } from "../lib/plans/repository";
import { publishEvent } from "../lib/plans/events";
import { GET } from "../app/api/plans/events/route";
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(requireAssistantUser).mockResolvedValue({
    user: { id: "u" },
    role: "coachee",
    locale: "en",
  } as NonNullable<Awaited<ReturnType<typeof requireAssistantUser>>>);
});
afterEach(() => vi.useRealTimers());
it("requires authentication", async () => {
  vi.mocked(requireAssistantUser).mockResolvedValue(null);
  expect(
    (await GET(new Request("http://localhost/api/plans/events"))).status,
  ).toBe(401);
});
it("streams only currently readable events and cleans up on abort", async () => {
  const abort = new AbortController(),
    response = await GET(
      new Request("http://localhost/api/plans/events", {
        signal: abort.signal,
      }),
    ),
    reader = response.body!.getReader();
  await reader.read();
  const pending = reader.read();
  publishEvent({
    planId: "p",
    engagementId: "e",
    coachId: "c",
    coacheeId: "u",
  });
  expect(new TextDecoder().decode((await pending).value)).toContain(
    'data: {"planId":"p","engagementId":"e"}',
  );
  expect(canReadPlans).toHaveBeenCalledWith(
    { userId: "u", role: "coachee" },
    "e",
  );
  abort.abort();
  expect((await reader.read()).done).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("closes when the session is revoked", async () => {
  const response = await GET(new Request("http://localhost/api/plans/events")),
    reader = response.body!.getReader();
  await reader.read();
  vi.mocked(requireAssistantUser).mockResolvedValue(null);
  await vi.advanceTimersByTimeAsync(25000);
  expect((await reader.read()).done).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("suppresses events for an engagement that is no longer readable", async () => {
  vi.mocked(canReadPlans).mockResolvedValueOnce(false);
  const abort = new AbortController(),
    response = await GET(
      new Request("http://localhost/api/plans/events", {
        signal: abort.signal,
      }),
    ),
    reader = response.body!.getReader();
  await reader.read();
  const pending = reader.read();
  publishEvent({
    planId: "p",
    engagementId: "ended",
    coachId: "c",
    coacheeId: "u",
  });
  await vi.advanceTimersByTimeAsync(1);
  abort.abort();
  expect((await pending).done).toBe(true);
});
