import { z } from "zod";
import { authMessages } from "./portals";
export type ActionState = {
  error?: string;
  fields?: Record<string, string[] | undefined>;
  verifyEmail?: string;
};
// One source for the HTML hints, the zod rules and the Better Auth config.
export const limits = {
  name: { min: 2, max: 120 },
  email: { max: 255 },
  password: { min: 12, max: 128 },
} as const;
const name = z
  .string()
  .trim()
  .min(limits.name.min, `Enter at least ${limits.name.min} characters.`)
  .max(limits.name.max, `Use ${limits.name.max} characters or fewer.`);
const email = z
  .email("Enter a valid email address.")
  .max(limits.email.max)
  .transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(limits.password.min, `Use at least ${limits.password.min} characters.`)
  .max(limits.password.max, `Use ${limits.password.max} characters or fewer.`);
export const emailSchema = z.object({ email });
export const signInSchema = z.object({ email, password });
export const signUpSchema = signInSchema.extend({ name });
let timeZones: Set<string> | undefined;
export function timezone(value: unknown): string {
  timeZones ??= new Set(Intl.supportedValuesOf("timeZone"));
  return typeof value === "string" && timeZones.has(value) ? value : "UTC";
}
export const registrationSchema = z.object({
  name,
  timezone: z.unknown().optional().transform(timezone),
});
export const resetSchema = z
  .object({
    token: z.string().min(1, authMessages.link_invalid()),
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });
