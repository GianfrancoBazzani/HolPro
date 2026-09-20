import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
vi.mock("../lib/pro/profile-actions", () => ({ updateCoachProfile: vi.fn() }));
import { AccountControls } from "../components/account/account-controls";
import { I18nProvider } from "../components/i18n/provider";
import { getDictionary } from "../lib/i18n/dictionary";
import { localeKeys, type Locale } from "../lib/i18n/config";
import { limits } from "../lib/pro/schemas";
async function render(
  profile?: { bio: string; acceptingClients: boolean },
  locale: Locale = "en",
) {
  const messages = await getDictionary(locale);
  return renderToStaticMarkup(
    <I18nProvider
      locale={locale}
      messages={{ settings: messages.settings, pro: messages.pro }}
    >
      <AccountControls profile={profile} />
    </I18nProvider>,
  );
}
it("hides the profile section for accounts without a coach profile", async () => {
  const html = await render();
  expect(html).not.toContain("<textarea");
  expect(html).toContain('name="locale"');
});
it("renders the coach profile with the saved values", async () => {
  const bio = "Strength coach";
  const html = await render({ bio, acceptingClients: false });
  expect(html).toContain(bio);
  expect(html).toContain('name="bio"');
  expect(html).toMatch(/name="acceptingClients"(?![^>]*checked)/);
  const remaining = new Intl.NumberFormat("en").format(
    limits.bioMax - bio.length,
  );
  expect(html).toContain(`${remaining} characters left`);
});
for (const locale of localeKeys)
  it(`renders the profile labels in ${locale}`, async () => {
    const messages = await getDictionary(locale);
    const html = await render({ bio: "", acceptingClients: true }, locale);
    expect(html).toContain(messages.settings["profile.title"]);
    expect(html).toMatch(/name="acceptingClients"[^>]*checked/);
  });
