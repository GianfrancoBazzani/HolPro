import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
vi.mock("../lib/pro/profile-actions", () => ({ updateCoachProfile: vi.fn() }));
vi.mock("../lib/pro/skill-actions", () => ({
  saveCoachSkill: vi.fn(),
  deleteCoachSkill: vi.fn(),
}));
vi.mock("../lib/pro/skills-repository", () => ({
  listCoachSkills: vi.fn(),
}));
import { requirePortalUser } from "../lib/auth/gate";
import { listCoachSkills } from "../lib/pro/skills-repository";
import { SkillsPage } from "../components/pro/skills-page";
import { localeKeys } from "../lib/i18n/config";
import { getDictionary } from "../lib/i18n/dictionary";
beforeEach(() => {
  vi.mocked(requirePortalUser).mockResolvedValue({
    id: "coach",
    name: "Coach",
    timezone: "UTC",
    coach: { bio: "Bio", acceptingClients: true },
  } as unknown as Awaited<ReturnType<typeof requirePortalUser>>);
});
for (const locale of localeKeys)
  it(`renders the skills list in ${locale}`, async () => {
    vi.mocked(listCoachSkills).mockResolvedValue([
      {
        id: "s",
        name: "client-intake",
        description: "Use when a new client arrives.",
        instructions: "Ask five questions.",
        updatedAt: "2026-09-20T10:00:00.000Z",
      },
    ]);
    const html = renderToStaticMarkup(await SkillsPage({ locale }));
    const messages = await getDictionary(locale);
    // React escapes apostrophes in static markup.
    const escaped = (text: string) => text.replaceAll("'", "&#x27;");
    expect(html).toContain(escaped(messages.pro["skills.title"]));
    expect(html).toContain(escaped(messages.pro["skills.new"]));
    expect(html).toContain("client-intake");
    expect(html).toContain("Use when a new client arrives.");
    expect(html).not.toContain("Ask five questions.");
    expect(html).toContain('href="/pro"');
    expect(listCoachSkills).toHaveBeenCalledWith("coach");
  });
it("shows the empty state", async () => {
  vi.mocked(listCoachSkills).mockResolvedValue([]);
  const html = renderToStaticMarkup(await SkillsPage({ locale: "en" }));
  expect(html).toContain("No skills yet.");
});
