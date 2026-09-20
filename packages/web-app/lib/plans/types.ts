import type { z } from "zod";
import type { planContentSchema, planSummarySchema } from "@/lib/mcp/schemas";
export type PlanEngagement = {
  id: string;
  coachName: string;
  coacheeName: string;
  status: string;
};
export type PlanSummary = z.infer<typeof planSummarySchema>;
export type PlanContent = z.infer<typeof planContentSchema>;
export class PlanAccessError extends Error {
  constructor() {
    super("Plan or engagement not found or not accessible.");
  }
}

export class PlanDraftChangedError extends PlanAccessError {}
