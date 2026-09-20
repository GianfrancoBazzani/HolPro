import { z } from "zod";
import { itemKinds, checkpointStatuses } from "@holpro/db/schema";
import { limits, calendarDateSchema } from "@/lib/pro/schemas";
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

// Shared by MCP, the assistant, and the stored-draft approval boundary.
const calendarUuid = z.uuid().toLowerCase();
const calendarTitle = z.string().trim().min(1).max(limits.titleMax);
const calendarText = z
  .string()
  .trim()
  .max(limits.textMax)
  .nullable()
  .transform((v) => v || null);
const tempId = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/);
const itemRef = z.union([calendarUuid, tempId]);
const kind = z.enum(itemKinds);
const status = z.enum(checkpointStatuses);
const hasPatch = (value: Record<string, unknown>) =>
  Object.entries(value).some(
    ([key, field]) => key !== "op" && key !== "id" && field !== undefined,
  );
export const calendarOperationSchema = z.discriminatedUnion("op", [
  z.strictObject({
    op: z.literal("createItem"),
    tempId,
    kind,
    title: calendarTitle,
    description: calendarText.optional(),
  }),
  z
    .strictObject({
      op: z.literal("updateItem"),
      id: calendarUuid,
      kind: kind.optional(),
      title: calendarTitle.optional(),
      description: calendarText.optional(),
    })
    .refine(hasPatch, "An update requires at least one field."),
  z.strictObject({ op: z.literal("deleteItem"), id: calendarUuid }),
  z.strictObject({
    op: z.literal("createCheckpoint"),
    itemRef,
    date: calendarDateSchema,
    title: calendarTitle,
    status: status.optional(),
    note: calendarText.optional(),
  }),
  z
    .strictObject({
      op: z.literal("updateCheckpoint"),
      id: calendarUuid,
      date: calendarDateSchema.optional(),
      title: calendarTitle.optional(),
      status: status.optional(),
      note: calendarText.optional(),
    })
    .refine(hasPatch, "An update requires at least one field."),
  z.strictObject({ op: z.literal("deleteCheckpoint"), id: calendarUuid }),
  z
    .strictObject({
      op: z.literal("createPeriod"),
      itemRef,
      startDate: calendarDateSchema,
      endDate: calendarDateSchema,
      title: calendarTitle,
      note: calendarText.optional(),
    })
    .refine(
      (v) => v.endDate >= v.startDate,
      "End date must not precede start date.",
    ),
  z
    .strictObject({
      op: z.literal("updatePeriod"),
      id: calendarUuid,
      startDate: calendarDateSchema.optional(),
      endDate: calendarDateSchema.optional(),
      title: calendarTitle.optional(),
      note: calendarText.optional(),
    })
    .refine(hasPatch, "An update requires at least one field."),
  z.strictObject({ op: z.literal("deletePeriod"), id: calendarUuid }),
]);
export const calendarOperationsSchema = z
  .array(calendarOperationSchema)
  .min(1)
  .max(100)
  .superRefine((operations, ctx) => {
    const declared = new Set<string>(),
      deleted = new Set<string>();
    operations.forEach((operation, index) => {
      const issue = (message: string) =>
        ctx.addIssue({ code: "custom", path: [index], message });
      if (operation.op === "createItem") {
        if (declared.has(operation.tempId))
          issue("Temporary item ids must be unique.");
        declared.add(operation.tempId);
      }
      if ("itemRef" in operation) {
        if (
          !z.uuid().safeParse(operation.itemRef).success &&
          !declared.has(operation.itemRef)
        )
          issue("Declare a temporary item before referencing it.");
        if (deleted.has(operation.itemRef))
          issue("A deleted item cannot be referenced.");
      }
      if ("id" in operation) {
        if (deleted.has(operation.id))
          issue("A deleted row cannot be changed again.");
        if (operation.op.startsWith("delete")) deleted.add(operation.id);
      }
    });
  });
export const proposeCalendarChangesSchema = z.strictObject({
  engagementId: z.uuid(),
  operations: calendarOperationsSchema,
});
export const readCalendarDraftSchema = z.strictObject({
  engagementId: z.uuid(),
});
export const calendarSubmitResultSchema = z.object({
  engagementId: z.string(),
  draftId: z.string(),
  status: z.literal("pending_review"),
  submittedAt: z.string(),
  operationCount: z.number().int(),
});
export const calendarDraftResultSchema = z.object({
  invalid: z.boolean().optional(),
  engagementId: z.string(),
  draftId: z.string(),
  submittedAt: z.string(),
  operations: z.array(
    z.object({
      operation: calendarOperationSchema,
      title: z.string().nullable(),
      itemTitle: z.string().nullable(),
      targetDate: calendarDateSchema.optional(),
      targetStartDate: calendarDateSchema.optional(),
      targetEndDate: calendarDateSchema.optional(),
    }),
  ),
});
export type CalendarOperation = z.output<typeof calendarOperationSchema>;
export type ProposeCalendarChangesInput = z.input<
  typeof proposeCalendarChangesSchema
>;
export type CalendarDraft = z.output<typeof calendarDraftResultSchema>;
