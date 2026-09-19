import { locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { serif, sans } from "@/lib/i18n/fonts";
import { I18nProvider } from "@/components/i18n/provider";
// The HTML document shared by the root layout and the global 404 page.
export function Document({
  locale,
  common,
  children,
}: {
  locale: Locale;
  common: Dictionary["common"];
  children: React.ReactNode;
}) {
  return (
    <html
      lang={locale}
      dir={locales[locale].dir}
      className={`${serif.variable} ${sans.variable}`}
    >
      <body>
        <I18nProvider locale={locale} messages={{ common }}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
