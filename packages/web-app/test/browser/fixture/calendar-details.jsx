import { Timeline } from "@/components/dashboard/timeline";
export function CalendarDetailsFixture() {
  return (
    <Timeline
      today="2026-09-20"
      data={{
        engagements: [{ id: "e", coachName: "Coach", startedAt: "2026-01-01" }],
        preferences: { rowOrder: [], hiddenKinds: [], hiddenEngagements: [] },
        items: [
          {
            id: "i",
            engagementId: "e",
            kind: "training",
            title: "Strength",
            description: "Three sessions each week.",
            createdAt: "2026-09-20",
            checkpoints: [],
            periods: [
              {
                id: "p",
                title: "Base phase",
                startDate: "2026-09-21",
                endDate: "2026-09-30",
                note: "Keep the first week gentle.",
              },
            ],
          },
        ],
      }}
    />
  );
}
