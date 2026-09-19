import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
vi.mock("../lib/calendar/actions", () => ({
  saveCalendarPreferences: vi.fn(),
}));
vi.mock("../lib/calendar/repository", () => ({ loadCalendar: vi.fn() }));
import { requirePortalUser } from "../lib/auth/gate";
import { loadCalendar } from "../lib/calendar/repository";
import { Dashboard } from "../components/dashboard/dashboard";
import { getDictionary } from "../lib/i18n/dictionary";
import { localeKeys } from "../lib/i18n/config";
import type { CalendarData } from "../lib/calendar/types";
const empty: CalendarData = {
  engagements: [],
  items: [],
  preferences: { rowOrder: [], hiddenEngagements: [], hiddenKinds: [] },
};
const sample: CalendarData = {
  ...empty,
  engagements: [
    { id: "e", coachName: "Sample Coach", startedAt: "2026-01-01" },
  ],
  items: [
    {
      id: "a",
      engagementId: "e",
      kind: "training",
      title: "Strength programme",
      description: null,
      createdAt: "2026-01-01",
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
          date: "2026-09-19",
          title: "Push",
          note: "Stay steady",
          status: "planned",
        },
      ],
    },
  ],
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-19T12:00:00Z"));
  vi.mocked(requirePortalUser).mockResolvedValue({
    id: "user",
    name: "Alex",
    timezone: "UTC",
  } as Awaited<ReturnType<typeof requirePortalUser>>);
});
afterEach(() => vi.useRealTimers());
for (const locale of localeKeys) {
  it(`renders empty dashboard and placeholders in ${locale}`, async () => {
    vi.mocked(loadCalendar).mockResolvedValue(empty);
    const html = renderToStaticMarkup(await Dashboard({ locale }));
    const d = (await getDictionary(locale)).dashboard;
    for (const key of [
      "empty.noEngagement",
      "empty.noItems",
      "chat.body",
    ] as const)
      expect(html).toContain(d[key].replaceAll("'", "&#x27;"));
    expect(html).not.toContain('role="grid"');
    expect(html).toContain("Alex");
  });
  it(`renders localized months, marks and kinds in ${locale}`, async () => {
    vi.mocked(loadCalendar).mockResolvedValue(sample);
    const html = renderToStaticMarkup(await Dashboard({ locale }));
    const d = (await getDictionary(locale)).dashboard;
    expect(html).toContain("Strength programme");
    expect(html).toContain("Base phase");
    expect(html).toContain("Stay steady");
    expect(html).not.toContain("calendar-coach");
    expect(html).not.toContain("Plan artifact");
    expect(html).toContain(d["kind.training"]);
    expect(html).toContain(
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date("2026-09-01Z")),
    );
    expect(html).toContain('aria-label="Push,');
    expect(html).toContain('disabled=""');
  });
  it(`distinguishes no items, hidden rows and clipped entries in ${locale}`, async () => {
    const d = (await getDictionary(locale)).dashboard;
    vi.mocked(loadCalendar).mockResolvedValue({ ...sample, items: [] });
    expect(renderToStaticMarkup(await Dashboard({ locale }))).toContain(
      d["empty.noItems"],
    );
    vi.mocked(loadCalendar).mockResolvedValue({
      ...sample,
      preferences: { ...empty.preferences, hiddenKinds: ["training"] },
    });
    expect(renderToStaticMarkup(await Dashboard({ locale }))).toContain(
      d["empty.allHidden"],
    );
    vi.mocked(loadCalendar).mockResolvedValue({
      ...sample,
      items: [
        {
          ...sample.items[0],
          checkpoints: [
            { ...sample.items[0].checkpoints[0], date: "2030-01-01" },
          ],
        },
      ],
    });
    expect(renderToStaticMarkup(await Dashboard({ locale }))).toContain(
      d["notice.clipped"],
    );
  });
}
it("reveals the remaining engagement even when old preferences hide it", async () => {
  vi.mocked(loadCalendar).mockResolvedValue({
    ...sample,
    preferences: { ...empty.preferences, hiddenEngagements: ["e"] },
  });
  const html = renderToStaticMarkup(await Dashboard({ locale: "en" }));
  expect(html).toContain('role="grid"');
});
