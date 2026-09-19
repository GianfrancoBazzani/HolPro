import type { Metadata } from "next";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import { localeKeys } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/routes";
import { baseURL } from "@/lib/auth/portals";
import { Rich } from "@/components/i18n/rich";
import { LanguageControl } from "@/components/i18n/language-control";
import { LocaleHint, type Hints } from "@/components/i18n/locale-hint";
import { pageLocale, type LocaleParams } from "@/lib/i18n/page";
import Image from "next/image";
import Link from "next/link";
import wordmark from "@/public/brand/wordmark.png";
import logomark from "@/public/brand/logomark.png";
import session from "@/public/brand/coach-session.jpg";
import mindfulness from "@/public/brand/how-photo.webp";
import coach from "@/public/brand/coach-photo.webp";
import pistachioStem from "@/public/brand/pistachio-stem.jpg";
import cuminStem from "@/public/brand/cumin-stem.jpg";

const navigation = [
  { href: "#how", label: "nav.how" },
  { href: "#features", label: "nav.features" },
  { href: "#coaches", label: "nav.coaches" },
] as const;

const audiences = [
  {
    label: "audiences.1.label",
    title: "audiences.1.title",
    body: "audiences.1.body",
    surface: "orchid",
  },
  {
    label: "audiences.2.label",
    title: "audiences.2.title",
    body: "audiences.2.body",
    surface: "pistachio",
  },
  {
    label: "audiences.3.label",
    title: "audiences.3.title",
    body: "audiences.3.body",
    surface: "pine",
  },
] as const;

const steps = [
  {
    title: "steps.1.title",
    body: "steps.1.body",
  },
  {
    title: "steps.2.title",
    body: "steps.2.body",
  },
  {
    title: "steps.3.title",
    body: "steps.3.body",
  },
  {
    title: "steps.4.title",
    body: "steps.4.body",
  },
] as const;

const features = [
  {
    title: "features.1.title",
    body: "features.1.body",
    color: "pistachio",
  },
  {
    title: "features.2.title",
    body: "features.2.body",
    color: "orchid",
  },
  {
    title: "features.3.title",
    body: "features.3.body",
    color: "cumin",
  },
  {
    title: "features.4.title",
    body: "features.4.body",
    color: "parchment",
  },
  {
    title: "features.5.title",
    body: "features.5.body",
    color: "pistachio",
  },
  {
    title: "features.6.title",
    body: "features.6.body",
    color: "orchid",
  },
] as const;

const disciplines = [
  { label: "disciplines.1.label", color: "pistachio" },
  { label: "disciplines.2.label", color: "orchid" },
  { label: "disciplines.3.label", color: "cumin" },
  { label: "disciplines.4.label", color: "parchment" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const locale = await pageLocale(params);
  // Title and description come from the layout; Open Graph inherits them.
  return {
    metadataBase: new URL(baseURL),
    alternates: {
      canonical: localePath(locale, "/"),
      languages: {
        ...Object.fromEntries(
          localeKeys.map((key) => [key, localePath(key, "/")]),
        ),
        "x-default": "/",
      },
    },
    openGraph: { locale },
  };
}
export default async function Home({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params);
  const dictionary = await getDictionary(locale);
  const t = translator(dictionary, "landing");
  const common = translator(dictionary, "common");
  const hints = Object.fromEntries(
    await Promise.all(
      localeKeys.map(async (key) => [key, (await getDictionary(key)).language]),
    ),
  ) as Hints;
  const stepNumber = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
  return (
    <>
      <a className="skip-link button button-primary" href="#main">
        {common("skip")}
      </a>
      <nav className="site-nav container" aria-label={t("nav.label")}>
        <a className="brand-link" href="#" aria-label={t("brand.home")}>
          <Image
            className="wordmark"
            src={wordmark}
            alt={t("brand.name")}
            sizes="78px"
            preload
          />
        </a>
        <div className="nav-links">
          {navigation.map(({ href, label }) => (
            <a key={href} href={href}>
              {t(label)}
            </a>
          ))}
          <Link className="nav-login" href="/login">
            {t("nav.login")}
          </Link>
          <Link className="button button-primary nav-button" href="/login">
            {t("start.button")}
          </Link>
        </div>
      </nav>

      <main id="main">
        <header className="hero container">
          <div className="hero-copy">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1>
              <Rich text={t("hero.title")} />
            </h1>
            <p className="lead">{t("hero.body")}</p>
            <div className="button-group">
              <Link className="button button-primary" href="/login">
                {t("start.button")}
              </Link>
              <a className="button button-secondary" href="#how">
                {t("hero.method")}
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-tile leaf fill-orchid">
              <Image
                src={session}
                alt=""
                fill
                sizes="(max-width: 940px) 45vw, 260px"
                preload
              />
            </div>
            <div className="hero-tile leaf-alt fill-pistachio mark-tile">
              <Image src={logomark} alt="" sizes="120px" />
            </div>
            <div className="hero-tile leaf-alt fill-cumin" />
            <div className="hero-tile leaf fill-pine">
              <span className="leaf-decor">
                <span className="leaf-cluster">
                  <span className="leaf" />
                  <span className="leaf-alt" />
                  <span className="leaf-alt" />
                  <span className="leaf" />
                </span>
              </span>
            </div>
          </div>
        </header>

        <section
          className="audiences container section"
          aria-labelledby="audiences-heading"
        >
          <div className="section-heading">
            <p className="eyebrow">{t("audiences.eyebrow")}</p>
            <h2 id="audiences-heading">{t("audiences.title")}</h2>
          </div>
          <div className="audience-grid">
            {audiences.map(({ label, title, body, surface }) => (
              <article
                className={`audience-card surface-${surface}`}
                key={label}
              >
                <p className="eyebrow">{t(label)}</p>
                <h3>{t(title)}</h3>
                <p>{t(body)}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how"
          className="container section how-grid"
          aria-labelledby="how-heading"
        >
          <div className="how-intro">
            <p className="eyebrow">{t("nav.how")}</p>
            <h2 id="how-heading">{t("how.title")}</h2>
            <div className="session-photo">
              <Image
                src={mindfulness}
                alt={t("how.photo")}
                fill
                sizes="320px"
              />
            </div>
          </div>
          <ol className="steps">
            {steps.map(({ title, body }, index) => (
              <li key={title}>
                <span className="step-number" aria-hidden="true">
                  {stepNumber.format(index + 1)}
                </span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="features"
          className="surface-pine"
          aria-labelledby="features-heading"
        >
          <div className="container section-large features-content">
            <div className="features-heading">
              <div className="section-heading">
                <p className="eyebrow">{t("nav.features")}</p>
                <h2 id="features-heading">{t("features.title")}</h2>
              </div>
              <ul className="legend" aria-label={t("disciplines.label")}>
                {disciplines.map(({ label, color }) => (
                  <li key={label}>
                    <span className={`dot fill-${color}`} aria-hidden="true" />
                    {t(label)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="features-grid">
              {features.map(({ title, body, color }) => (
                <article className="feature-card" key={title}>
                  <span
                    className={`feature-leaf leaf fill-${color}`}
                    aria-hidden="true"
                  />
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="coaches"
          className="container section-large coaches-grid"
          aria-labelledby="coaches-heading"
        >
          <div className="coach-art">
            <Image
              className="decoration"
              src={pistachioStem}
              alt=""
              fill
              sizes="(max-width: 900px) 90vw, 520px"
            />
            <div className="coach-portrait leaf">
              <Image
                src={coach}
                alt={t("coaches.photo")}
                fill
                sizes="(max-width: 900px) 50vw, 290px"
              />
            </div>
          </div>
          <div className="coach-copy">
            <p className="eyebrow">{t("coaches.eyebrow")}</p>
            <h2 id="coaches-heading">{t("coaches.title")}</h2>
            <p>{t("coaches.body")}</p>
            <ul className="checklist">
              <li>
                <span className="dot fill-cumin" aria-hidden="true" />
                {t("coaches.onboard")}
              </li>
              <li>
                <span className="dot fill-pistachio" aria-hidden="true" />
                {t("coaches.week")}
              </li>
              <li>
                <span className="dot fill-orchid" aria-hidden="true" />
                {t("coaches.methods")}
              </li>
            </ul>
            <Link className="button button-secondary" href="/pro/login">
              {t("coaches.button")}
            </Link>
          </div>
        </section>

        <section id="start" className="cta" aria-labelledby="start-heading">
          <Image
            className="cta-pattern decoration"
            src={cuminStem}
            alt=""
            sizes="(max-width: 600px) 100vw, 700px"
          />
          <div className="container cta-content">
            <div className="cta-text">
              <h2 id="start-heading">{t("cta.title")}</h2>
              <p className="cta-lead">{t("cta.body")}</p>
            </div>
            <div className="cta-actions">
              <Link className="button button-primary" href="/login">
                {t("cta.button")}
              </Link>
              <p className="cta-alt">
                {t("cta.coach")}{" "}
                <Link href="/pro/login">{t("coaches.button")}</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer container">
        <a className="brand-link" href="#" aria-label={t("brand.home")}>
          <Image
            className="wordmark"
            src={wordmark}
            alt={t("brand.name")}
            sizes="60px"
          />
        </a>
        <nav aria-label={t("footer.label")}>
          {navigation.map(({ href, label }) => (
            <a key={href} href={href}>
              {t(label)}
            </a>
          ))}
        </nav>
        <LanguageControl
          locale={locale}
          messages={dictionary.language}
          next="/"
        />
        <span className="copyright">{t("footer.copyright")}</span>
      </footer>
      <LocaleHint current={locale} hints={hints} />
    </>
  );
}
