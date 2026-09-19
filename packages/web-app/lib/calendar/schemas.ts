import { z } from "zod";
import { itemKinds } from "@holpro/db/schema";
const ids = z
  .array(z.uuid())
  .max(500)
  .transform((values) => [...new Set(values)]);
export const calendarPreferencesSchema = z.object({
  rowOrder: ids,
  hiddenEngagements: ids,
  hiddenKinds: z
    .array(z.enum(itemKinds))
    .max(500)
    .transform((values) => [...new Set(values)]),
});
export type CalendarPreferences = z.infer<typeof calendarPreferencesSchema>;
