import type { Metadata } from "next";
import { currentLocale } from "@/lib/i18n/request";
import { getDictionary } from "@/lib/i18n/dictionary";
import { Document } from "@/components/i18n/document";
import NotFound from "./[lang]/not-found";
import "./[lang]/globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary(await currentLocale());
  return { title: dictionary.common["notFound.title"] };
}
// A dynamic root layout cannot supply the initial HTML of unmatched routes.
// Next's global fallback owns that document, including fonts and the provider.
export default async function GlobalNotFound() {
  const locale = await currentLocale();
  const { common } = await getDictionary(locale);
  return (
    <Document locale={locale} common={common}>
      <NotFound />
    </Document>
  );
}
