import type { ProActionState } from "@/lib/pro/types";
async function record(intent: string, form: FormData): Promise<ProActionState> {
  (window as typeof window & { calendarReview?: unknown }).calendarReview = {
    intent,
    ...Object.fromEntries(form),
  };
  await new Promise((resolve) => setTimeout(resolve, 150));
  return { ok: true };
}
export async function approveCalendarDraft(
  _state: ProActionState,
  form: FormData,
) {
  return record("approve", form);
}
export async function discardCalendarDraft(
  _state: ProActionState,
  form: FormData,
) {
  return record("discard", form);
}
