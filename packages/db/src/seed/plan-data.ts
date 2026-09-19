import type { ItemKind, CheckpointStatus } from "../schema/plans";
type SeedItem = {
  kind: ItemKind;
  title: string;
  checkpoints: { date: string; title: string; status: CheckpointStatus }[];
  periods: { startDate: string; endDate: string; title: string }[];
};
export function samplePlan(today: string): SeedItem[] {
  const date = new Date(`${today}T00:00:00Z`);
  const add = (offset: number) =>
    new Date(date.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  const start = 1 - (date.getUTCDay() || 7) - 14;
  const day = (offset: number) => add(start + offset);
  const training: SeedItem = {
    kind: "training",
    title: "Training",
    checkpoints: [],
    periods: [
      { title: "Base phase", startDate: day(0), endDate: day(27) },
      { title: "Bulk stage", startDate: day(28), endDate: day(55) },
    ],
  };
  const nutrition: SeedItem = {
    kind: "nutrition",
    title: "Nutrition",
    checkpoints: [],
    periods: [{ title: "2,600 kcal", startDate: day(0), endDate: day(55) }],
  };
  for (let week = 0; week < 8; week++) {
    for (const [index, title] of ["Push", "Pull", "Legs"].entries())
      training.checkpoints.push({
        title,
        date: day(week * 7 + index * 2),
        status:
          week === 1 && index === 2 ? "skipped" : week < 2 ? "done" : "planned",
      });
    nutrition.checkpoints.push({
      title: "Weekly check-in",
      date: day(week * 7 + 6),
      status: week < 2 ? "done" : "planned",
    });
  }
  return [
    training,
    nutrition,
    {
      kind: "mindset",
      title: "Mindset",
      periods: [],
      checkpoints: [
        { title: "Goal review", date: day(7), status: "done" },
        { title: "Reflection", date: day(35), status: "planned" },
      ],
    },
  ];
}
