import { z } from "zod";
import { translator, type Dictionary } from "@/lib/i18n/dictionary";
import { limits } from "./schemas";
export function parseForm<S extends z.ZodType>(
  schema: S,
  form: FormData,
  dictionary: Dictionary,
): { data: z.output<S> } | { fields: Record<string, string[] | undefined> } {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (parsed.success) return { data: parsed.data };
  const t = translator(dictionary, "pro");
  const fields: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = Object.hasOwn(dictionary.pro, issue.message)
      ? (issue.message as keyof Dictionary["pro"])
      : "validation.invalid";
    (fields[String(issue.path[0] ?? "id")] ??= []).push(t(key, limits));
  }
  return { fields };
}
