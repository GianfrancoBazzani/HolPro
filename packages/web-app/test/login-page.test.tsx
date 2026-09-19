import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../components/auth/forms", () => ({
  LoginForm: () => null,
  ResetForm: () => null,
  WelcomeForm: () => null,
}));
import { LoginPage } from "../components/auth/pages";
import { getDictionary } from "../lib/i18n/dictionary";
import { localeKeys } from "../lib/i18n/config";
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
import { portals } from "../lib/auth/portals";
for (const locale of localeKeys)
  for (const portal of Object.values(portals))
    it(`shows direct magic-link error for ${portal.key}/${locale}`, async () => {
      const html = renderToStaticMarkup(
        await LoginPage({
          portal,
          params: Promise.resolve({ lang: locale }),
          searchParams: Promise.resolve({ error: "INVALID_TOKEN" }),
        }),
      );
      expect(html).toContain(
        (await getDictionary(locale)).auth["error.link_invalid"],
      );
    });
it.each(["__proto__", "constructor", "unknown"])(
  "drops unknown error %s",
  async (error) => {
    const html = renderToStaticMarkup(
      await LoginPage({
        portal: portals.coachee,
        params: Promise.resolve({ lang: "en" }),
        searchParams: Promise.resolve({ error }),
      }),
    );
    expect(html).not.toContain('role="alert"');
  },
);
