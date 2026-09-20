import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../lib/pro/calendar-draft-actions", () => ({
  approveCalendarDraft: vi.fn(),
  discardCalendarDraft: vi.fn(),
}));
import { CalendarDraftPanel } from "../components/pro/calendar-draft-panel";
import { getDictionary } from "../lib/i18n/dictionary";
import { I18nProvider } from "../components/i18n/provider";
import type { CalendarDraft } from "../lib/mcp/schemas";
const id = "11111111-1111-4111-8111-111111111111";
const draft: CalendarDraft = {
  engagementId: id,
  draftId: "draft",
  submittedAt: "2026-09-20T01:00:00Z",
  operations: [
    {
      operation: {
        op: "createItem",
        tempId: "one",
        title: "Strength",
        kind: "training",
      },
      title: "Strength",
      itemTitle: null,
    },
    {
      operation: { op: "updateItem", id, title: "New title" },
      title: "Old title",
      itemTitle: null,
    },
    {
      operation: { op: "deleteItem", id },
      title: "Removed item",
      itemTitle: null,
    },
    {
      operation: {
        op: "createCheckpoint",
        itemRef: id,
        date: "2026-09-20",
        title: "Review",
      },
      title: "Review",
      itemTitle: "Strength",
    },
    {
      operation: { op: "updateCheckpoint", id, status: "done" },
      title: "Check",
      itemTitle: "Strength",
    },
    { operation: { op: "deleteCheckpoint", id }, title: null, itemTitle: null },
    {
      operation: {
        op: "createPeriod",
        itemRef: id,
        startDate: "2026-09-20",
        endDate: "2026-09-30",
        title: "Phase",
      },
      title: "Phase",
      itemTitle: "Strength",
    },
    {
      operation: { op: "updatePeriod", id, note: "<script>evil</script>" },
      title: "Phase",
      itemTitle: "Strength",
    },
    {
      operation: { op: "deletePeriod", id },
      title: "Old phase",
      itemTitle: "Strength",
    },
  ],
};
it.each(["America/Los_Angeles", "Pacific/Kiritimati"])(
  "renders reviewable operations without shifting calendar dates in %s",
  async (timezone) => {
    const messages = await getDictionary("en");
    const html = renderToStaticMarkup(
      <I18nProvider locale="en" messages={messages}>
        <CalendarDraftPanel
          draft={draft}
          locale="en"
          timezone={timezone}
          messages={messages}
        />
      </I18nProvider>,
    );
    expect(html).toContain("<em>Strength</em>");
    expect(html).toContain("Sep 20, 2026");
    expect(html).toContain("Sep 30, 2026");
    expect(html).toContain(messages.pro["calendarDraft.op.unknown"]);
    expect(html).toContain(messages.pro["calendarDraft.approve"]);
    expect(html).toContain("New title");
    expect(html).toContain("&lt;script&gt;evil&lt;/script&gt;");
    expect(html).not.toContain("<script>evil</script>");
  },
);
it("renders nothing without a proposal", async () => {
  expect(
    renderToStaticMarkup(
      <CalendarDraftPanel
        draft={null}
        locale="en"
        timezone="UTC"
        messages={await getDictionary("en")}
      />,
    ),
  ).toBe("");
});
it("distinguishes repeated checkpoint titles by parent and existing date", async () => {
  const messages = await getDictionary("en");
  const repeated = {
    ...draft,
    operations: [
      {
        operation: { op: "deleteCheckpoint" as const, id },
        title: "Review",
        itemTitle: "Strength",
        targetDate: "2026-09-20",
      },
      {
        operation: { op: "deleteCheckpoint" as const, id },
        title: "Review",
        itemTitle: "Mobility",
        targetDate: "2026-09-27",
      },
    ],
  };
  const html = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <CalendarDraftPanel
        draft={repeated}
        locale="en"
        timezone="UTC"
        messages={messages}
      />
    </I18nProvider>,
  );
  expect(html).toContain("Strength");
  expect(html).toContain("Mobility");
  expect(html).toContain("Sep 20, 2026");
  expect(html).toContain("Sep 27, 2026");
});
it("keeps obsolete drafts discardable while disabling approval", async () => {
  const messages = await getDictionary("en");
  const invalid = { ...draft, operations: [], invalid: true };
  const html = renderToStaticMarkup(
    <I18nProvider locale="en" messages={messages}>
      <CalendarDraftPanel
        draft={invalid}
        locale="en"
        timezone="UTC"
        messages={messages}
      />
    </I18nProvider>,
  );
  expect(html).toContain(messages.pro["error.draftChanged"]);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Approve changes/);
  expect(html).toContain(messages.pro["calendarDraft.discard"]);
});
