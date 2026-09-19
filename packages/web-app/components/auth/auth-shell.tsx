import type { Locale } from "@/lib/i18n/config";
import { translator, type Dictionary } from "@/lib/i18n/dictionary";
import { localePath } from "@/lib/i18n/routes";
import { I18nProvider } from "@/components/i18n/provider";
import { LanguageControl } from "@/components/i18n/language-control";
import Image from "next/image";
import Link from "next/link";
import type { Portal } from "@/lib/auth/portals";
import wordmark from "@/public/brand/wordmark-parchment.png";
import pineStem from "@/public/brand/pine-stem.jpg";
import "./auth.css";
export function AuthShell({
  portal,
  locale,
  messages,
  children,
}: {
  portal: Portal;
  locale: Locale;
  messages: Pick<Dictionary, "auth" | "language">;
  children: React.ReactNode;
}) {
  const t = translator(messages, "auth");
  return (
    <I18nProvider locale={locale} messages={{ auth: messages.auth }}>
      <main className="auth-shell container">
        <section
          className={`auth-brand auth-brand-${portal.key}`}
          aria-label={t("brand.name")}
        >
          <Image
            className="auth-pattern"
            src={pineStem}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            priority
          />
          <Link href={localePath(locale, "/")} className="auth-wordmark">
            <Image
              src={wordmark}
              alt={t("brand.home")}
              className="auth-wordmark-img"
            />
          </Link>
          <div className="auth-brand-copy">
            <span className="auth-leaf" aria-hidden="true" />
            <p>{t(`portal.${portal.key}.heading`)}</p>
            <span>{t("brand.tagline")}</span>
          </div>
        </section>
        <section className="auth-content">
          <span className="eyebrow">{t(`portal.${portal.key}.label`)}</span>
          {children}
          <LanguageControl locale={locale} messages={messages.language} />
        </section>
      </main>
    </I18nProvider>
  );
}
