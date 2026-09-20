import { z } from "zod";
import { itemKinds, checkpointStatuses } from "@holpro/db/schema";
import type { Client } from "@/lib/pro/types";
export const clientSchema = z.object({
  engagementId: z.string(),
  name: z.string(),
  startedAt: z.string(),
});
export const toClientSummary = ({
  engagementId,
  name,
  startedAt,
}: Client): z.infer<typeof clientSchema> => ({ engagementId, name, startedAt });
export const planSchema = z.object({
  engagements: z.array(
    z.object({ id: z.string(), coachName: z.string(), startedAt: z.string() }),
  ),
  items: z.array(
    z.object({
      id: z.string(),
      engagementId: z.string(),
      kind: z.enum(itemKinds),
      title: z.string(),
      description: z.string().nullable(),
      createdAt: z.string(),
      periods: z.array(
        z.object({
          id: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          title: z.string(),
          note: z.string().nullable(),
        }),
      ),
      checkpoints: z.array(
        z.object({
          id: z.string(),
          date: z.string(),
          title: z.string(),
          note: z.string().nullable(),
          status: z.enum(checkpointStatuses),
        }),
      ),
    }),
  ),
});
