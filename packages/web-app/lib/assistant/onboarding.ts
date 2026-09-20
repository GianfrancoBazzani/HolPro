import type { CalendarData } from "@/lib/calendar/types";
import { loadCalendar } from "@/lib/calendar/repository";
import { hasPublishedPlan } from "@/lib/plans/repository";
import { loadCoacheeGoals } from "./goals";
export function isOnboarding(
  calendar: Pick<CalendarData, "items">,
  hasDocument = false,
) {
  return calendar.items.length === 0 && !hasDocument;
}
export async function loadOnboardingState(userId: string) {
  const [calendar, goals, hasDocument] = await Promise.all([
    loadCalendar(userId),
    loadCoacheeGoals(userId),
    hasPublishedPlan(userId),
  ]);
  return {
    onboarding: isOnboarding(calendar, hasDocument),
    goalsSaved: !!goals,
  };
}
