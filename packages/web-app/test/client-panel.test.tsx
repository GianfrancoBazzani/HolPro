vi.mock("../lib/calendar/draft-repository", () => ({ readCalendarDraft: vi.fn(async () => null) }));
vi.mock("../lib/pro/calendar-draft-actions", () => ({ approveCalendarDraft: vi.fn(), discardCalendarDraft: vi.fn() }));
import { readCalendarDraft } from "../lib/calendar/draft-repository";
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
  useRouter: () => ({ refresh: () => {} }),
  notFound: () => {
    throw Error("404");
  },
}));
vi.mock("../lib/plans/view", () => ({ loadPlanView: vi.fn(async () => ({ engagementId: "e", engagements: [], plans: [], content: null, framed: null })) }));
import { requirePortalUser } from "../lib/auth/gate";
import { loadClientPlan } from "../lib/pro/repository";
import { ClientPanel } from "../components/pro/client-panel";
import { localeKeys } from "../lib/i18n/config";
import { getDictionary } from "../lib/i18n/dictionary";
beforeEach(() => {
  vi.mocked(readCalendarDraft).mockReset().mockResolvedValue(null);
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
it("keeps ended clients' plans readable without editing controls", async () => {
  vi.mocked(loadClientPlan).mockResolvedValue({
    status: "ended",
    client: { engagementId: "e", name: "Former client", email: "client@example.com", image: null, startedAt: "2026-01-01T00:00:00Z" },
    calendar: { engagements: [], items: [], preferences: { rowOrder: [], hiddenKinds: [], hiddenEngagements: [] } },
  });
  const html = renderToStaticMarkup(await ClientPanel({ locale: "en", engagementId: "e" }));
  expect(html).toContain("Former client");
  expect(readCalendarDraft).not.toHaveBeenCalled();
  expect(html).toContain("plan-document-heading");
  expect(html).not.toContain((await getDictionary("en")).pro["plan.addItem"]);
});
for (const locale of localeKeys)
  it(`renders editable client plan in ${locale}`, async () => {
    vi.mocked(loadClientPlan).mockResolvedValue({
      status: "active",
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
    expect(html).toContain("plan-document-heading");
    expect(html).toContain('class="assistant-sidebar"');
    expect(html).toContain((await getDictionary(locale)).assistant["greeting.default"].replace("{name}", "Coach"));
    expect(html).not.toContain("/pro?engagement=e");
    expect(html).toContain("Client Name");
    expect(html).toContain("Well done");
    expect(html).toContain(d["plan.addItem"]);
    expect(html).toContain(d["plan.addCheckpoint"]);
    expect(html).not.toContain("calendar-coach");
    expect(html).toContain('href="/pro"');
  });

it("shows a pending calendar proposal above the editor only when present", async () => {
  vi.mocked(loadClientPlan).mockResolvedValue({status:"active",client:{engagementId:"e",name:"Client",email:"c@example.com",image:null,startedAt:"2026-01-01Z"},calendar:{engagements:[],items:[],preferences:{rowOrder:[],hiddenKinds:[],hiddenEngagements:[]}}});
  vi.mocked(readCalendarDraft).mockResolvedValue({engagementId:"e",draftId:"d",submittedAt:"2026-09-20Z",operations:[{operation:{op:"createItem",tempId:"one",kind:"training",title:"New strength"},title:"New strength",itemTitle:null}]});
  const dictionary=await getDictionary("en");
  const html=renderToStaticMarkup(await ClientPanel({locale:"en",engagementId:"e"}));
  expect(html).toContain(dictionary.pro["calendarDraft.title"]);
  expect(html).toContain("New strength");
  expect(html.indexOf(dictionary.pro["calendarDraft.title"])).toBeLessThan(html.indexOf(dictionary.pro["client.planTitle"]));
  vi.mocked(readCalendarDraft).mockResolvedValue(null);
  expect(renderToStaticMarkup(await ClientPanel({locale:"en",engagementId:"e"}))).not.toContain(dictionary.pro["calendarDraft.title"]);
});

it("keeps the client page usable when a stored draft is obsolete", async () => {
  vi.mocked(loadClientPlan).mockResolvedValue({status:"active",client:{engagementId:"e",name:"Client",email:"c@example.com",image:null,startedAt:"2026-01-01Z"},calendar:{engagements:[],items:[],preferences:{rowOrder:[],hiddenKinds:[],hiddenEngagements:[]}}});
  vi.mocked(readCalendarDraft).mockResolvedValue({engagementId:"e",draftId:"obsolete",submittedAt:"2026-09-20Z",operations:[],invalid:true});
  const dictionary=await getDictionary("en");
  const html=renderToStaticMarkup(await ClientPanel({locale:"en",engagementId:"e"}));
  expect(html).toContain(dictionary.pro["error.draftChanged"]);
  expect(html).toContain(dictionary.pro["calendarDraft.discard"]);
  expect(html).toContain(dictionary.pro["client.planTitle"]);
});
