import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { requireRole } from "./context";
import { assistantContext } from "../context";
import { requestOnboarding, listOnboarding } from "@/lib/onboarding/repository";
export const requestCoachOnboarding = createTool({
  id: "requestCoachOnboarding",
  description:
    "After the user explicitly confirms a coach returned by searchCoaches, persist their selection, create their customer relationship and queue that coach's agent to prepare a private draft. Reuses an existing request; never publishes a plan. Use the saved goals, without asking the user to repeat answers. Only report success after this tool succeeds.",
  inputSchema: z.object({ coachId: z.uuid() }),
  execute: async ({ coachId }, { requestContext }) => {
    const row = await requestOnboarding(
      requireRole(requestContext, "coachee"),
      coachId,
    );
    return {
      requestId: row.id,
      engagementId: row.engagementId,
      coachId: row.coachId,
      status: row.status,
    };
  },
});
export const getOnboardingStatus = createTool({
  id: "getOnboardingStatus",
  description:
    "Read persisted coach selections and onboarding progress for the current user. Use before searching again or when asked about an onboarding request. Failed preparation can be retried from the dashboard. A rejected draft is not an approved plan.",
  inputSchema: z.object({}),
  execute: async (_input, { requestContext }) => ({
    requests: await listOnboarding(assistantContext(requestContext)),
  }),
});
