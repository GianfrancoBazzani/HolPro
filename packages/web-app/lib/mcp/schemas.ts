import { z } from "zod";
export const roleSchema = z.enum(["coach", "coachee"]);
export const publishPlanSchema = z
  .object({
    engagementId: z.uuid(),
    planId: z.uuid().optional(),
    title: z.string().trim().min(1).max(160).optional(),
    html: z.string().min(1).max(2_000_000),
  })
  .refine((value) => !!value.planId || !!value.title, {
    path: ["title"],
    message: "A title is required for a new plan.",
  });
export const listPlansSchema = z.object({ engagementId: z.uuid().optional() });
export const readPlanSchema = z
  .object({
    planId: z.uuid(),
    version: z.number().int().positive().optional(),
    draft: z.boolean().optional(),
  })
  .refine((v) => !v.draft || v.version === undefined);
export const planSummarySchema = z.object({
  planId: z.string(),
  engagementId: z.string(),
  title: z.string(),
  versionNumber: z.number(),
  updatedAt: z.string(),
  draftSubmittedAt: z.string().nullable().optional(),
});
export const planContentSchema = z.object({
  planId: z.string(),
  title: z.string(),
  versionNumber: z.number(),
  html: z.string(),
  publishedAt: z.string(),
});
export const approveResultSchema = z.object({
  planId: z.string(),
  versionNumber: z.number(),
  publishedAt: z.string(),
});
export const publishResultSchema = z.object({
  planId: z.string(),
  status: z.literal("pending_review"),
  submittedAt: z.string(),
});
export const planDraftSchema = z.object({
  planId: z.string(),
  draftId: z.string(),
  title: z.string(),
  html: z.string(),
  submittedAt: z.string(),
});
export const readPlanResultSchema = z.union([
  planContentSchema,
  planDraftSchema,
]);
export type PublishPlanInput = z.infer<typeof publishPlanSchema>;
export const searchCoachesSchema = z.object({
  query: z.string().trim().max(200).optional(),
});
export const coachSummarySchema = z.object({
  coachId: z.string(),
  name: z.string(),
  bio: z.string(),
  specialties: z.array(z.string()),
});
export const searchCoachesResultSchema = z.object({
  coaches: z.array(coachSummarySchema),
});
export type CoachSummary = z.infer<typeof coachSummarySchema>;
