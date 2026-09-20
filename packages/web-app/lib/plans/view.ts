import {
  findPlanEngagementId,
  listPlanEngagements,
  listPlans,
  readPlan,
  readPlanDraft,
} from "./repository";
import { PlanAccessError, type PlanSummary } from "./types";
import type { McpActor } from "@/lib/mcp/actor";
import { framePlanHtml } from "./frame";
export type PlanSelection = {
  engagement?: unknown;
  plan?: unknown;
  preview?: unknown;
};
export async function loadPlanView(
  actor: McpActor,
  query: PlanSelection = {},
  retry = true,
): Promise<PlanView> {
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
  let draft: Awaited<ReturnType<typeof readPlanDraft>> | null = null;
  try {
    if (actor.role === "coach" && selected?.draftSubmittedAt)
      draft = await readPlanDraft(actor, selected.planId);
  } catch (error) {
    if (!(error instanceof PlanAccessError)) throw error;
    if (retry) return loadPlanView(actor, query, false);
  }
  const content =
    selected && (draft || selected.versionNumber > 0)
      ? draft && (query.preview !== "published" || selected.versionNumber === 0)
        ? { kind: "draft" as const, ...draft }
        : {
            kind: "published" as const,
            ...(await readPlan(actor, selected.planId)),
          }
      : null;
  return {
    engagements,
    engagementId,
    plans,
    selected,
    draft,
    content,
    framed: content ? framePlanHtml(content.html) : null,
  };
}
export type PlanView = {
  engagements: Awaited<ReturnType<typeof listPlanEngagements>>;
  engagementId: string | undefined;
  plans: PlanSummary[];
  selected: PlanSummary | undefined;
  draft: Awaited<ReturnType<typeof readPlanDraft>> | null;
  content:
    | ({ kind: "draft" } & Awaited<ReturnType<typeof readPlanDraft>>)
    | ({ kind: "published" } & Awaited<ReturnType<typeof readPlan>>)
    | null;
  framed: ReturnType<typeof framePlanHtml> | null;
};
