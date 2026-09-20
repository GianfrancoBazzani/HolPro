import { CalendarDraftPanel } from "@/components/pro/calendar-draft-panel";
export function CalendarDraftFixture({ locale, messages }) {
  const id = "11111111-1111-4111-8111-111111111111";
  const draft = {
    engagementId: id,
    draftId: "22222222-2222-4222-8222-222222222222",
    submittedAt: "2026-09-20T09:30:00Z",
    operations: [
      {
        operation: {
          op: "createItem",
          tempId: "strength",
          kind: "training",
          title: "Strength and steady progress",
          description:
            "Three focused sessions each week, with time to recover.",
        },
        title: "Strength and steady progress",
        itemTitle: null,
      },
      {
        operation: {
          op: "createPeriod",
          itemRef: "strength",
          title: "Foundation phase",
          startDate: "2026-09-21",
          endDate: "2026-10-18",
        },
        title: "Foundation phase",
        itemTitle: "Strength and steady progress",
      },
      {
        operation: {
          op: "updateCheckpoint",
          id,
          title: "Review progress together",
          date: "2026-10-02",
          note: null,
        },
        title: "Weekly review",
        itemTitle: "Strength and steady progress",
        targetDate: "2026-09-25",
      },
    ],
  };
  if (new URLSearchParams(location.search).has("invalid")) {
    draft.invalid = true;
    draft.operations = [];
  }
  return (
    <CalendarDraftPanel
      draft={draft}
      locale={locale}
      timezone="Europe/Malta"
      messages={messages}
    />
  );
}
