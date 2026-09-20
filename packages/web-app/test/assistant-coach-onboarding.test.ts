import { expect, it, vi } from "vitest";
import { noopObserve } from "@mastra/core/tools";
vi.mock("../lib/onboarding/repository", () => ({
  requestOnboarding: vi.fn(async () => ({
    id: "r",
    engagementId: "e",
    coachId: "11111111-1111-4111-8111-111111111111",
    status: "requested",
    goals: "private goals",
  })),
  listOnboarding: vi.fn(async () => []),
}));
import { requestCoachOnboarding } from "../mastra/tools/coach-onboarding";
import { toRequestContext } from "../mastra/context";
const context = (role: "coach" | "coachee") => ({
  observe: noopObserve,
  requestContext: toRequestContext({
    userId: "u",
    name: "Alex",
    surface: "web",
    role,
    locale: "en",
    timezone: "UTC",
    onboarding: true,
    goalsSaved: true,
  }),
});
it("rejects a coach attempting to request onboarding as a client", async () => {
  await expect(
    requestCoachOnboarding.execute!(
      { coachId: "11111111-1111-4111-8111-111111111111" },
      context("coach"),
    ),
  ).rejects.toThrow("forbidden");
});
it("returns a persisted acknowledgement without leaking internal goals", async () => {
  const result = await requestCoachOnboarding.execute!(
    { coachId: "11111111-1111-4111-8111-111111111111" },
    context("coachee"),
  );
  expect(result).toEqual({
    requestId: "r",
    engagementId: "e",
    coachId: "11111111-1111-4111-8111-111111111111",
    status: "requested",
  });
});
