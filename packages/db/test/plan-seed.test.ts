import { expect, it } from "vitest";
import { samplePlan } from "../src/seed/plan-data";
it("builds eight weeks with past completions and the skipped second Friday", () => {
  const [training, nutrition, mindset] = samplePlan("2026-09-19");
  expect(training.checkpoints).toHaveLength(24);
  expect(training.checkpoints[0]).toMatchObject({
    date: "2026-08-31",
    title: "Push",
    status: "done",
  });
  expect(training.checkpoints[5]).toMatchObject({
    date: "2026-09-11",
    title: "Legs",
    status: "skipped",
  });
  expect(training.checkpoints[6]).toMatchObject({
    date: "2026-09-14",
    status: "planned",
  });
  expect(training.periods).toEqual([
    { title: "Base phase", startDate: "2026-08-31", endDate: "2026-09-27" },
    { title: "Bulk stage", startDate: "2026-09-28", endDate: "2026-10-25" },
  ]);
  expect(nutrition.checkpoints).toHaveLength(8);
  expect(nutrition.checkpoints[1]).toMatchObject({
    date: "2026-09-13",
    status: "done",
  });
  expect(nutrition.checkpoints[2]).toMatchObject({
    date: "2026-09-20",
    status: "planned",
  });
  expect(mindset.checkpoints.map((c) => c.status)).toEqual(["done", "planned"]);
});
