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
  vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "u" } } as Awaited<ReturnType<typeof auth.api.getSession>>);
  const user = { id: "u", status: "active", deletedAt: null, coach: {}, coachee: {} };
  vi.mocked(loadUserWithRoles).mockResolvedValue(user as Awaited<ReturnType<typeof loadUserWithRoles>>);
  const request = (portal: string) => new Request(`http://localhost/api/assistant/chat?portal=${portal}`);
  expect(await requireAssistantUser(request("coachee"))).toMatchObject({ role: "coachee" });
  expect(await requireAssistantUser(request("coach"))).toMatchObject({ role: "coach" });
  expect(await requireAssistantUser(request("invalid"))).toBeNull();
  vi.mocked(loadUserWithRoles).mockResolvedValue({ ...user, coach: null } as Awaited<ReturnType<typeof loadUserWithRoles>>);
  expect(await requireAssistantUser(request("coach"))).toBeNull();
});
