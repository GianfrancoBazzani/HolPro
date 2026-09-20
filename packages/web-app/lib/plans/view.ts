import {
  findPlanEngagementId,
  listPlanEngagements,
  listPlans,
  readPlan,
} from "./repository";
import type { PlanActor, PlanSummary } from "./types";
import { framePlanHtml } from "./frame";
export type PlanSelection = { engagement?: unknown; plan?: unknown };
export async function loadPlanView(
  actor: PlanActor,
  query: PlanSelection = {},
) {
  const requestedPlan = typeof query.plan === "string" ? query.plan : undefined;
  // A coachee sees every readable plan. A coach sees one engagement at a time.
  const [engagements, allPlans] = await Promise.all([
    listPlanEngagements(actor),
    actor.role === "coach" ? undefined : listPlans(actor),
  ]);
  let engagementId: string | undefined;
  let plans: PlanSummary[];
  if (actor.role === "coach") {
    engagementId =
      engagements.find((e) => e.id === query.engagement)?.id ??
      (requestedPlan
        ? await findPlanEngagementId(actor, requestedPlan)
        : undefined) ??
      engagements[0]?.id;
    plans = engagementId ? await listPlans(actor, engagementId) : [];
  } else plans = allPlans!;
  const selected = plans.find((p) => p.planId === requestedPlan) ?? plans[0];
  const content = selected ? await readPlan(actor, selected.planId) : null;
  return {
    engagements,
    engagementId,
    plans,
    selected,
    content,
    framed: content ? framePlanHtml(content.html) : null,
  };
}
export type PlanView = Awaited<ReturnType<typeof loadPlanView>>;
