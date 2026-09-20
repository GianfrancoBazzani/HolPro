import { expect, it, vi } from "vitest";
vi.mock("../lib/auth/server", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));
vi.mock("../lib/auth/repository", () => ({ loadUserWithRoles: vi.fn() }));
import { loadUserWithRoles } from "../lib/auth/repository";
import { auth } from "../lib/auth/server";
import { requireAssistantUser } from "../lib/assistant/session";
it("revalidates sessions in the database rather than trusting cached cookies", async () => {
  await requireAssistantUser(new Request("http://localhost/api/plans/events"));
  expect(auth.api.getSession).toHaveBeenCalledWith(
    expect.objectContaining({
      query: { disableRefresh: true, disableCookieCache: true },
    }),
  );
});

it("uses the requested portal for dual-role users and rejects unowned roles", async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "u" }, session: { id: "session" } } as Awaited<ReturnType<typeof auth.api.getSession>>);
  const user = { id: "u", status: "active", deletedAt: null, coach: {}, coachee: {} };
  vi.mocked(loadUserWithRoles).mockResolvedValue(user as Awaited<ReturnType<typeof loadUserWithRoles>>);
  const request = (portal: string) => new Request(`http://localhost/api/assistant/chat?portal=${portal}`);
  expect(await requireAssistantUser(request("coachee"))).toMatchObject({
    role: "coachee",
    actor: { userId: "u", role: "coachee" },
    sessionId: "session",
  });
  expect(await requireAssistantUser(request("coach"))).toMatchObject({ role: "coach" });
  expect(await requireAssistantUser(request("invalid"))).toBeNull();
  vi.mocked(loadUserWithRoles).mockResolvedValue({ ...user, coach: null } as Awaited<ReturnType<typeof loadUserWithRoles>>);
  expect(await requireAssistantUser(request("coach"))).toBeNull();
});
import { resolveThread } from "../lib/assistant/session";
import { listConversations } from "../lib/assistant/conversations";
import { threadMemory } from "./helpers/thread-memory";
const actor = { role: "coachee", userId: "u" } as const;
it("lists only the portal's conversations, newest first, capped at 20", async () => {
  const threads = Array.from({ length: 25 }, (_, i) => ({
    id: `coachee:u:${i}`,
    resourceId: "u",
    title: `T${i}`,
    updatedAt: new Date(Date.UTC(2026, 0, 1 + i)),
  }));
  threads.push(
    { id: "coachee:u", resourceId: "u", title: "", updatedAt: new Date("2026-03-01T00:00:00.000Z") },
    { id: "telegram:u", resourceId: "u", title: "tg", updatedAt: new Date("2026-04-01T00:00:00.000Z") },
    { id: "coach:u", resourceId: "u", title: "coach", updatedAt: new Date("2026-04-01T00:00:00.000Z") },
    { id: "coachee:v:1", resourceId: "v", title: "other", updatedAt: new Date("2026-04-01T00:00:00.000Z") },
  );
  const memory = threadMemory(threads);
  const list = await listConversations(memory, actor);
  expect(memory.listThreads).toHaveBeenCalledWith(
    expect.objectContaining({
      filter: { resourceId: "u" },
      orderBy: { field: "updatedAt", direction: "DESC" },
      perPage: false,
    }),
  );
  expect(list).toHaveLength(20);
  expect(list[0]).toEqual({ id: "coachee:u", title: null, updatedAt: "2026-03-01T00:00:00.000Z" });
  expect(list[1].id).toBe("coachee:u:24");
  expect(list.map((c) => c.id)).not.toContain("telegram:u");
  expect(list.map((c) => c.id)).not.toContain("coach:u");
});
it("resolves the default, accepts owned ids and refuses foreign or missing ones", async () => {
  const memory = threadMemory([
    { id: "coachee:u", resourceId: "u", updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "coachee:u:a", resourceId: "u", updatedAt: "2026-02-01T00:00:00.000Z" },
    { id: "coachee:u:stolen", resourceId: "v", updatedAt: "2026-02-01T00:00:00.000Z" },
    { id: "telegram:u", resourceId: "u", updatedAt: "2026-05-01T00:00:00.000Z" },
  ]);
  expect(await resolveThread(memory, actor, null)).toEqual({ id: "coachee:u:a", exists: true });
  expect(await resolveThread(memory, actor, "coachee:u:a")).toEqual({ id: "coachee:u:a", exists: true });
  expect(await resolveThread(memory, actor, "coachee:u")).toEqual({ id: "coachee:u", exists: true });
  expect(await resolveThread(memory, actor, "coachee:u:stolen")).toBeNull();
  expect(await resolveThread(memory, actor, "telegram:u")).toBeNull();
  expect(await resolveThread(memory, actor, "coach:u")).toBeNull();
  expect(await resolveThread(memory, actor, "coachee:u:missing")).toBeNull();
  expect(await resolveThread(threadMemory(), actor, null)).toEqual({ id: "coachee:u", exists: false });
  expect(await resolveThread(threadMemory(), actor, "coachee:u")).toEqual({ id: "coachee:u", exists: false });
});
