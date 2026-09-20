import { noopObserve } from "@mastra/core/tools";
import { expect, it, vi } from "vitest";
vi.mock("../lib/calendar/repository", () => ({
  loadCalendar: vi.fn(async (id: string) => ({
    engagements: [{ id, coachName: "Coach", startedAt: "2026-01-01" }],
    items: [],
    preferences: {},
  })),
}));
vi.mock("../lib/pro/repository", () => ({
  loadClients: vi.fn(async (id: string) => [
    {
      engagementId: id,
      name: "Alex",
      startedAt: "2026-01-01",
      email: "private",
    },
  ]),
  loadClientPlan: vi.fn(async (coach: string, id: string) =>
    coach === "u" && id === "owned"
      ? {
          client: {
            name: "Alex",
            engagementId: "owned",
            startedAt: "2026-01-01",
            email: "private",
            image: null,
          },
          calendar: { engagements: [], items: [] },
        }
      : undefined,
  ),
}));
vi.mock("../lib/assistant/goals", () => ({
  saveCoacheeGoals: vi.fn(),
  loadClientGoals: vi.fn(async () => ({ goals: "Focus", summary: "Focus" })),
}));
import { getMyPlan } from "../mastra/tools/get-my-plan";
import { getClientPlan } from "../mastra/tools/get-client-plan";
import { listMyClients } from "../mastra/tools/list-my-clients";
import { saveOnboardingGoals } from "../mastra/tools/save-onboarding-goals";
import { toRequestContext, type AssistantContext } from "../mastra/context";
const base: AssistantContext = {
  userId: "u",
  name: "Alex",
  role: "coachee",
  locale: "en",
  timezone: "UTC",
  onboarding: true,
  goalsSaved: false,
};
const ctx = (role: "coachee" | "coach") => ({
  observe: noopObserve,
  requestContext: toRequestContext({ ...base, role }),
});
it("reads only the current coachee and omits preferences", async () => {
  expect(await getMyPlan.execute!({}, ctx("coachee"))).toEqual({
    engagements: [{ id: "u", coachName: "Coach", startedAt: "2026-01-01" }],
    items: [],
  });
});
it("rejects a role that is not allowed to use a tool", async () => {
  await expect(getMyPlan.execute!({}, ctx("coach"))).rejects.toThrow(
    "forbidden",
  );
  await expect(
    saveOnboardingGoals.execute!(
      { goals: "Focus", summary: "Focus" },
      ctx("coach"),
    ),
  ).rejects.toThrow("forbidden");
});
it("does not expose foreign engagements", async () => {
  expect(
    await getClientPlan.execute!({ engagementId: "foreign" }, ctx("coach")),
  ).toEqual({ found: false });
});
it("includes goals for an owned engagement", async () => {
  expect(
    await getClientPlan.execute!({ engagementId: "owned" }, ctx("coach")),
  ).toMatchObject({ found: true, goals: { goals: "Focus" } });
});
it("returns a compact client list", async () => {
  expect(await listMyClients.execute!({}, ctx("coach"))).toEqual({
    clients: [{ engagementId: "u", name: "Alex", startedAt: "2026-01-01" }],
  });
});
it("saves goals", async () => {
  expect(
    await saveOnboardingGoals.execute!(
      { goals: "Focus", summary: "Focus" },
      ctx("coachee"),
    ),
  ).toEqual({ saved: true });
});
