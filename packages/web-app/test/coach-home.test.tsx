import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../lib/i18n/actions", () => ({ chooseLocale: vi.fn() }));
vi.mock("../lib/pro/repository", () => ({
  loadClients: vi.fn(),
  loadAgenda: vi.fn(),
}));
vi.mock("../lib/pro/agenda-actions", () => ({
  saveAgendaEvent: vi.fn(),
  deleteAgendaEvent: vi.fn(),
}));
import { requirePortalUser } from "../lib/auth/gate";
import { loadClients, loadAgenda } from "../lib/pro/repository";
import { CoachHome } from "../components/pro/coach-home";
import { monthGrid } from "../lib/pro/dates";
import { localeKeys } from "../lib/i18n/config";
import { getDictionary } from "../lib/i18n/dictionary";
beforeEach(() => {
  vi.mocked(requirePortalUser).mockResolvedValue({
    id: "coach",
    name: "Alex",
    timezone: "UTC",
  } as Awaited<ReturnType<typeof requirePortalUser>>);
  vi.mocked(loadClients).mockResolvedValue([]);
  vi.mocked(loadAgenda).mockResolvedValue({
    month: "2026-09",
    today: "2026-09-19",
    timezone: "UTC",
    weeks: monthGrid("2026-09"),
    events: {},
  });
});
for (const locale of localeKeys) {
  it(`renders empty coach home in ${locale}`, async () => {
    const html = renderToStaticMarkup(
      await CoachHome({ locale, month: "2026-09" }),
    );
    const d = (await getDictionary(locale)).pro;
    expect(html).toContain(d["agenda.empty"]);
    expect(html).toContain(d["clients.empty"]);
    expect(html).toContain("/pro?month=2026-08");
    expect(html).toContain("/pro?month=2026-10");
  });
  it(`shows three chips, overflow, and client cards in ${locale}`, async () => {
    vi.mocked(loadClients).mockResolvedValue([
      {
        engagementId: "e",
        name: "Adriana Pezzano",
        email: "a@example.com",
        image: null,
        startedAt: "2026-01-01T12:00:00Z",
      },
    ]);
    vi.mocked(loadAgenda).mockResolvedValue({
      month: "2026-09",
      today: "2026-09-19",
      timezone: "UTC",
      weeks: monthGrid("2026-09"),
      events: {
        "2026-09-20": Array.from({ length: 4 }, (_, i) => ({
          id: String(i),
          kind: "call",
          title: `Call ${i}`,
          startsAt: `2026-09-20T1${i}:00:00Z`,
          durationMinutes: 60,
          note: null,
          engagementId: "e",
          clientName: "Adriana Pezzano",
        })),
      },
    });
    const html = renderToStaticMarkup(
      await CoachHome({ locale, month: "2026-09" }),
    );
    expect(html.match(/class="agenda-event"/g)).toHaveLength(3);
    expect(html).toContain("+1");
    expect(html).toContain("/pro/clients/e");
    expect(html).toContain("AP");
  });
}
it("falls back from malformed month before querying", async () => {
  await CoachHome({ locale: "en", month: "nonsense" });
  expect(vi.mocked(loadAgenda).mock.lastCall?.[1]).toMatch(/^\d{4}-\d{2}$/);
});
it("does not count spillover events as activity in the displayed month", async () => {
  vi.mocked(loadAgenda).mockResolvedValue({
    month: "2026-09",
    today: "2026-09-19",
    timezone: "UTC",
    weeks: monthGrid("2026-09"),
    events: {
      "2026-08-31": [
        {
          id: "spill",
          kind: "event",
          title: "Last month",
          startsAt: "2026-08-31T12:00:00Z",
          durationMinutes: 60,
          note: null,
          engagementId: null,
          clientName: null,
        },
      ],
    },
  });
  expect(
    renderToStaticMarkup(await CoachHome({ locale: "en", month: "2026-09" })),
  ).toContain("No calls or events this month.");
});
