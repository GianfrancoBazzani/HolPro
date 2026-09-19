import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
vi.mock("../lib/pro/repository", () => ({ loadClientPlan: vi.fn() }));
vi.mock("../lib/pro/plan-actions", () => ({
  savePlanItem: vi.fn(),
  deletePlanItem: vi.fn(),
  savePlanCheckpoint: vi.fn(),
  deletePlanCheckpoint: vi.fn(),
  savePlanPeriod: vi.fn(),
  deletePlanPeriod: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("404");
  },
}));
import { requirePortalUser } from "../lib/auth/gate";
import { loadClientPlan } from "../lib/pro/repository";
import { ClientPanel } from "../components/pro/client-panel";
import { localeKeys } from "../lib/i18n/config";
import { getDictionary } from "../lib/i18n/dictionary";
beforeEach(() => {
  vi.mocked(requirePortalUser).mockResolvedValue({
    id: "coach",
    name: "Coach",
    timezone: "UTC",
  } as Awaited<ReturnType<typeof requirePortalUser>>);
});
it("returns 404 for unavailable clients", async () => {
  vi.mocked(loadClientPlan).mockResolvedValue(undefined);
  await expect(
    ClientPanel({ locale: "en", engagementId: "foreign" }),
  ).rejects.toThrow("404");
});
for (const locale of localeKeys)
  it(`renders editable client plan in ${locale}`, async () => {
    vi.mocked(loadClientPlan).mockResolvedValue({
      client: {
        engagementId: "e",
        name: "Client Name",
        email: "client@example.com",
        image: null,
        startedAt: "2026-01-01T00:00:00Z",
      },
      calendar: {
        engagements: [
          { id: "e", coachName: "Coach", startedAt: "2026-01-01T00:00:00Z" },
        ],
        preferences: { rowOrder: [], hiddenKinds: [], hiddenEngagements: [] },
        items: [
          {
            id: "i",
            engagementId: "e",
            title: "Strength",
            kind: "training",
            createdAt: "2026-09-01",
            description: "Build steadily",
            periods: [
              {
                id: "p",
                title: "Base phase",
                startDate: "2026-09-01",
                endDate: "2026-09-30",
                note: null,
              },
            ],
            checkpoints: [
              {
                id: "c",
                title: "Review",
                date: "2026-09-19",
                status: "done",
                note: "Well done",
              },
            ],
          },
        ],
      },
    });
    const html = renderToStaticMarkup(
      await ClientPanel({ locale, engagementId: "e" }),
    );
    const d = (await getDictionary(locale)).pro;
    expect(html).toContain("Client Name");
    expect(html).toContain("Well done");
    expect(html).toContain(d["plan.addItem"]);
    expect(html).toContain(d["plan.addCheckpoint"]);
    expect(html).not.toContain("calendar-coach");
    expect(html).toContain('href="/pro"');
  });
