import type { Metadata } from "next";
import { localeKeys } from "@/lib/i18n/config";
import { getDictionary, getTranslator } from "@/lib/i18n/dictionary";
import { pageLocale, type LocaleParams } from "@/lib/i18n/page";
import { Document } from "@/components/i18n/document";
import "./globals.css";

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const t = await getTranslator(await pageLocale(params), "landing");
  return { title: t("meta.title"), description: t("meta.description") };
}
export const dynamicParams = false;
export function generateStaticParams() {
  return localeKeys.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LocaleParams;
}) {
  const lang = await pageLocale(params);
  const { common } = await getDictionary(lang);
  return (
    <Document locale={lang} common={common}>
      {children}
    </Document>
  );
}
