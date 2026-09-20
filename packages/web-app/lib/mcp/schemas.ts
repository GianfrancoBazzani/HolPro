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
export const readPlanSchema = z.object({
  planId: z.uuid(),
  version: z.number().int().positive().optional(),
});
export const planSummarySchema = z.object({
  planId: z.string(),
  engagementId: z.string(),
  title: z.string(),
  versionNumber: z.number(),
  updatedAt: z.string(),
});
export const planContentSchema = z.object({
  planId: z.string(),
  title: z.string(),
  versionNumber: z.number(),
  html: z.string(),
  publishedAt: z.string(),
});
export const publishResultSchema = z.object({
  planId: z.string(),
  versionNumber: z.number(),
  publishedAt: z.string(),
});
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
