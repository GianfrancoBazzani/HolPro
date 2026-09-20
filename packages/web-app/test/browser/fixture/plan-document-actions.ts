import type { ProActionState } from "@/lib/pro/types";
async function record(intent: string, form: FormData): Promise<ProActionState> {
  (window as typeof window & { planReview?: unknown }).planReview = {
    intent,
    ...Object.fromEntries(form),
  };
  return { ok: true };
}
export async function approvePlanDraft(_state: ProActionState, form: FormData) {
  return record("approve", form);
}
export async function discardPlanDraft(_state: ProActionState, form: FormData) {
  return record("discard", form);
}
