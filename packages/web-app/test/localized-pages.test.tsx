import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/i18n/request", () => ({ currentLocale: async () => "es" }));
vi.mock("../lib/i18n/fonts", () => ({
  serif: { variable: "serif" },
  sans: { variable: "sans" },
}));
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
import Home, { generateMetadata } from "../app/[lang]/page";
import { generateMetadata as layoutMetadata } from "../app/[lang]/layout";
import NotFound from "../app/[lang]/not-found";
import ErrorPage from "../app/[lang]/error";
import { I18nProvider } from "../components/i18n/provider";
import { getDictionary } from "../lib/i18n/dictionary";
import { localeKeys } from "../lib/i18n/config";
for (const locale of localeKeys)
  it(`renders landing, metadata and fallback UI in ${locale}`, async () => {
    const params = Promise.resolve({ lang: locale });
    const d = await getDictionary(locale);
    const html = renderToStaticMarkup(await Home({ params }));
    expect(html).toContain(d.landing["hero.title"]);
    expect(html).toContain('href="/login"');
    expect(html).not.toContain('href="/es/login"');
    expect(html).toContain('lang="es"');
    expect(html).toContain('name="next"');
    expect(html).not.toContain('class="locale-hint"');
    expect((await layoutMetadata({ params })).title).toBe(
      d.landing["meta.title"],
    );
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates?.languages).toEqual(
      Object.fromEntries([
        ...localeKeys.map((key) => [key, key === "en" ? "/" : `/${key}`]),
        ["x-default", "/"],
      ]),
    );
    expect(metadata.openGraph).toHaveProperty("locale", locale);
    const fallback = renderToStaticMarkup(
      <I18nProvider locale={locale} messages={{ common: d.common }}>
        <NotFound />
        <ErrorPage reset={() => {}} />
      </I18nProvider>,
    );
    expect(fallback).toContain(d.common["notFound.title"]);
    expect(fallback).toContain(d.common["error.retry"]);
  });
it("rejects unsupported root locale params", async () => {
  await expect(
    Home({ params: Promise.resolve({ lang: "constructor" }) }),
  ).rejects.toThrow("NOT_FOUND");
});

it("renders the global 404 document in the resolved language", async () => {
  const { default: GlobalNotFound } = await import("../app/global-not-found");
  const html = renderToStaticMarkup(await GlobalNotFound());
  expect(html).toContain('<html lang="es" dir="ltr"');
  expect(html).toContain("<h1>Página no encontrada.</h1>");
});
