import { clientSchema, planSchema, toClientSummary } from "./schemas";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { loadClientPlan } from "@/lib/pro/repository";
import { loadClientGoals } from "@/lib/assistant/goals";
import { requireRole } from "./context";
export const getClientPlan = createTool({
  id: "getClientPlan",
  description: "Read an owned client's plan and onboarding goals.",
  outputSchema: z.discriminatedUnion("found", [
    z.object({ found: z.literal(false) }),
    z.object({
      found: z.literal(true),
      client: clientSchema,
      goals: z.object({ goals: z.string(), summary: z.string() }).nullable(),
      plan: planSchema,
    }),
  ]),
  inputSchema: z.object({ engagementId: z.string().min(1) }),
  execute: async ({ engagementId }, { requestContext }) => {
    const { userId } = requireRole(requestContext, "coach");
    const [plan, goals] = await Promise.all([
      loadClientPlan(userId, engagementId),
      loadClientGoals(userId, engagementId),
    ]);
    if (!plan) return { found: false as const };
    return {
      found: true as const,
      client: toClientSummary(plan.client),
      goals,
      plan: {
        engagements: plan.calendar.engagements,
        items: plan.calendar.items,
      },
    };
  },
});
