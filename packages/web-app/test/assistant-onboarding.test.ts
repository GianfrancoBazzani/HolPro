vi.mock("../lib/plans/repository", () => ({ hasPublishedPlan: vi.fn(async () => false) }));
import { expect, it, vi } from "vitest";
vi.mock("../lib/calendar/repository", () => ({ loadCalendar: vi.fn() }));
vi.mock("../lib/assistant/goals", () => ({ loadCoacheeGoals: vi.fn() }));
import { isOnboarding, loadOnboardingState } from "../lib/assistant/onboarding";
import { loadCalendar } from "../lib/calendar/repository";
import { loadCoacheeGoals } from "../lib/assistant/goals";
import type { CalendarData } from "../lib/calendar/types";
const empty: CalendarData = {
  engagements: [],
  items: [],
  preferences: { rowOrder: [], hiddenEngagements: [], hiddenKinds: [] },
};
it("uses plan items, not engagement presence or goals", () => {
  expect(isOnboarding(empty)).toBe(true);
  expect(
    isOnboarding({
      ...empty,
      engagements: [{ id: "e", coachName: "Coach", startedAt: "2026-01-01" }],
    } as CalendarData),
  ).toBe(true);
  expect(isOnboarding({ items: [{}] } as CalendarData)).toBe(false);
});
it("loads saved goals without ending onboarding", async () => {
  vi.mocked(loadCalendar).mockResolvedValue(empty);
  vi.mocked(loadCoacheeGoals).mockResolvedValue({
    goals: "Focus",
    summary: "Focus",
  } as Awaited<ReturnType<typeof loadCoacheeGoals>>);
  expect(await loadOnboardingState("u")).toEqual({
    onboarding: true,
    goalsSaved: true,
  });
});
it("ends onboarding when an active engagement has an HTML plan", async () => { expect(isOnboarding(empty, true)).toBe(false); });
