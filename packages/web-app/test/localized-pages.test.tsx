import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const authMocks = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "better-auth.session_token=token" }),
}));
vi.mock("../lib/auth/server", () => ({
  auth: { api: { getSession: authMocks.session } },
}));
vi.mock("../lib/auth/repository", () => ({ loadUserWithRoles: authMocks.user }));
beforeEach(() => {
  vi.resetAllMocks();
  authMocks.session.mockResolvedValue(null);
});
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
    const html = renderToStaticMarkup(
      await Home({ params }),
    );
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

for (const locale of localeKeys) {
  for (const [role, destination] of [
    ["coach", "/pro"],
    ["coachee", "/app"],
  ]) {
    it(`links an authenticated ${role} to ${destination} in ${locale}`, async () => {
      authMocks.session.mockResolvedValue({ user: { id: "member" } });
      authMocks.user.mockResolvedValue({
        status: "active",
        deletedAt: null,
        coach: null,
        coachee: null,
        [role]: { userId: "member" },
      });
      const html = renderToStaticMarkup(
        await Home({ params: Promise.resolve({ lang: locale }) }),
      );
      const dictionary = await getDictionary(locale);
      expect(html).not.toContain('href="/login"');
      expect(html).not.toContain('href="/pro/login"');
      expect(html).not.toContain(dictionary.landing["start.button"]);
      expect(html.match(new RegExp(`href="${destination}"`, "g"))).toHaveLength(4);
      expect(html).toContain(dictionary.landing["dashboard.button"]);
      expect(html).not.toContain(`>${dictionary.landing["nav.login"]}</a>`);
      expect(html).not.toContain(`href="/${locale}${destination}"`);
      expect(authMocks.session).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        query: { disableRefresh: true, disableCookieCache: true },
      });
    });
  }
}

it("keeps login available when a token has no valid session", async () => {
  const html = renderToStaticMarkup(
    await Home({ params: Promise.resolve({ lang: "en" }) }),
  );
  expect(html).toContain('href="/login"');
  expect(html).not.toContain('href="/app"');
  expect(html).not.toContain('href="/pro"');
  expect(authMocks.user).not.toHaveBeenCalled();
});

it.each([
  undefined,
  { status: "suspended", deletedAt: null, coach: {}, coachee: null },
  { status: "active", deletedAt: new Date(), coach: null, coachee: {} },
])("does not offer a dashboard for an unavailable account: %j", async (user) => {
  authMocks.session.mockResolvedValue({ user: { id: "member" } });
  authMocks.user.mockResolvedValue(user);
  const html = renderToStaticMarkup(
    await Home({ params: Promise.resolve({ lang: "en" }) }),
  );
  expect(html).toContain('href="/login"');
  expect(html).not.toContain('href="/app"');
  expect(html).not.toContain('href="/pro"');
});
