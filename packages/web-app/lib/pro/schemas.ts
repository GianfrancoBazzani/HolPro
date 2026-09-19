import { z } from "zod";
import {
  agendaEventKinds,
  itemKinds,
  checkpointStatuses,
} from "@holpro/db/schema";
export const limits = {
  titleMax: 120,
  textMax: 2000,
  durationMin: 5,
  durationMax: 1440,
};
const uuid = z.uuid({ error: "validation.invalid" });
const optionalId = z.preprocess(
  (v) => (v === "" ? undefined : v),
  uuid.optional(),
);
const title = z
  .string()
  .trim()
  .min(1, "validation.title_required")
  .max(limits.titleMax, "validation.title_max");
const text = z
  .string()
  .trim()
  .max(limits.textMax, "validation.text_max")
  .optional()
  .transform((v) => v || null);
const date = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      Number(v.slice(0, 4)) >= 1000 &&
      Number.isFinite(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "validation.date",
  );
export const idSchema = z.object({ id: uuid });
export const eventSchema = z.object({
  id: optionalId,
  title,
  kind: z.enum(agendaEventKinds, { error: "validation.kind" }),
  engagementId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.uuid({ error: "validation.client" }).nullable(),
  ),
  date,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.time"),
  durationMinutes: z.coerce
    .number({ error: "validation.duration" })
    .int("validation.duration")
    .min(limits.durationMin, "validation.duration")
    .max(limits.durationMax, "validation.duration"),
  note: text,
});
export const itemSchema = z
  .object({
    id: optionalId,
    engagementId: optionalId,
    title,
    kind: z.enum(itemKinds, { error: "validation.kind" }),
    description: text,
  })
  .refine((v) => !!(v.id || v.engagementId), {
    path: ["engagementId"],
    error: "validation.invalid",
  });
export const checkpointSchema = z
  .object({
    id: optionalId,
    itemId: optionalId,
    title,
    date,
    status: z.enum(checkpointStatuses, { error: "validation.status" }),
    note: text,
  })
  .refine((v) => !!(v.id || v.itemId), {
    path: ["itemId"],
    error: "validation.invalid",
  });
export const periodSchema = z
  .object({
    id: optionalId,
    itemId: optionalId,
    title,
    startDate: date,
    endDate: date,
    note: text,
  })
  .refine((v) => !!(v.id || v.itemId), {
    path: ["itemId"],
    error: "validation.invalid",
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    error: "validation.range",
  });
