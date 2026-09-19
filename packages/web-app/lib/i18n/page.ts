import { notFound } from "next/navigation";
import { hasLocale } from "./config";
export type LocaleParams = Promise<{ lang: string }>;
export async function pageLocale(params: LocaleParams) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return lang;
}
