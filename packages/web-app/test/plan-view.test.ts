import { expect, it, vi } from "vitest";
vi.mock("../lib/plans/repository", () => ({
  readPlanDraft: vi.fn(),
  findPlanEngagementId: vi.fn(async (_actor, id) =>
    id === "p2" ? "e2" : undefined,
  ),
  listPlanEngagements: vi.fn(async () => [
    { id: "e1", coachName: "Coach", coacheeName: "Alex", status: "active" },
    { id: "e2", coachName: "Coach", coacheeName: "Sam", status: "ended" },
  ]),
  listPlans: vi.fn(async (_actor, id) =>
    [
      {
        planId: "p1",
        engagementId: "e1",
        title: "First",
        versionNumber: 1,
        updatedAt: "2026-09-20",
      },
      {
        planId: "p2",
        engagementId: "e2",
        title: "Second",
        versionNumber: 2,
        updatedAt: "2026-09-19",
      },
    ].filter((p) => !id || id === p.engagementId),
  ),
  readPlan: vi.fn(async (_actor, id) => ({
    planId: id,
    title: "Plan",
    versionNumber: 1,
    html: "<h1>Plan</h1>",
    publishedAt: "2026-09-20",
  })),
}));
import { loadPlanView } from "../lib/plans/view";
import { readPlan, listPlans } from "../lib/plans/repository";
it("does not fall back to another client when an explicit client is unavailable", async () => {
  await expect(loadPlanView({ userId: "c", role: "coach" }, { engagement: "foreign", plan: "p2" })).rejects.toThrow();
});
it("infers a coach engagement from an allowed plan and reads only that HTML", async () => {
  vi.clearAllMocks();
  const view = await loadPlanView(
    { userId: "c", role: "coach" },
    { plan: "p2" },
  );
  expect(view.engagementId).toBe("e2");
  expect(view.selected?.planId).toBe("p2");
  expect(readPlan).toHaveBeenCalledTimes(1);
});
it("falls back from foreign or mismatched selections", async () => {
  const view = await loadPlanView(
    { userId: "c", role: "coach" },
    { engagement: "e1", plan: "foreign" },
  );
  expect(view.selected?.planId).toBe("p1");
});
it("retains all allowed coachee plans", async () => {
  const view = await loadPlanView(
    { userId: "u", role: "coachee" },
    { plan: ["p2"] },
  );
  expect(view.plans).toHaveLength(2);
  expect(view.selected?.planId).toBe("p1");
});

it.each([{ engagement: "e2", plan: "p2" }, { plan: "p2" }])(
  "keeps an older engagement plan outside the global list: %j",
  async (query) => {
    vi.mocked(listPlans).mockImplementation(async (_actor, engagementId) =>
      engagementId === "e2"
        ? [
            {
              planId: "p2",
              engagementId: "e2",
              title: "Older plan",
              versionNumber: 1,
              updatedAt: "2026-01-01",
            },
          ]
        : [],
    );
    const view = await loadPlanView({ userId: "c", role: "coach" }, query);
    expect(view.engagementId).toBe("e2");
    expect(view.selected?.planId).toBe("p2");
  },
);

it("previews pending content by default and honors the published toggle", async () => {
  const { readPlanDraft } = await import("../lib/plans/repository");
  vi.mocked(listPlans).mockResolvedValue([
    {
      planId: "p1",
      engagementId: "e1",
      title: "Plan",
      versionNumber: 1,
      updatedAt: "2026-09-20",
      draftSubmittedAt: "2026-09-20",
    },
  ]);
  vi.mocked(readPlanDraft).mockResolvedValue({
    planId: "p1",
    draftId: "d1",
    title: "Draft",
    html: "draft",
    submittedAt: "2026-09-20",
  });
  expect(
    (await loadPlanView({ userId: "c", role: "coach" })).content?.kind,
  ).toBe("draft");
  expect(
    (
      await loadPlanView(
        { userId: "c", role: "coach" },
        { preview: "published" },
      )
    ).content?.kind,
  ).toBe("published");
  expect(
    (await loadPlanView({ userId: "u", role: "coachee" }, { preview: "draft" }))
      .draft,
  ).toBeNull();
});
it("a never approved plan always previews its draft", async () => {
  vi.mocked(listPlans).mockResolvedValue([
    {
      planId: "p1",
      engagementId: "e1",
      title: "Plan",
      versionNumber: 0,
      updatedAt: "2026-09-20",
      draftSubmittedAt: "2026-09-20",
    },
  ]);
  expect(
    (
      await loadPlanView(
        { userId: "c", role: "coach" },
        { preview: "published" },
      )
    ).content?.kind,
  ).toBe("draft");
});

it("reloads selection if a draft was discarded between listing and reading", async () => {
  const { readPlanDraft } = await import("../lib/plans/repository");
  const { PlanAccessError } = await import("../lib/plans/types");
  vi.mocked(listPlans)
    .mockResolvedValueOnce([
      {
        planId: "p1",
        engagementId: "e1",
        title: "Plan",
        versionNumber: 0,
        updatedAt: "2026-09-20",
        draftSubmittedAt: "2026-09-20",
      },
    ])
    .mockResolvedValueOnce([]);
  vi.mocked(readPlanDraft).mockRejectedValueOnce(new PlanAccessError());
  const result = await loadPlanView({ userId: "c", role: "coach" });
  expect(result.content).toBeNull();
  expect(result.plans).toEqual([]);
});
it("does not hide unexpected draft read errors", async () => {
  const { readPlanDraft } = await import("../lib/plans/repository");
  vi.mocked(listPlans).mockResolvedValueOnce([
    {
      planId: "p1",
      engagementId: "e1",
      title: "Plan",
      versionNumber: 0,
      updatedAt: "2026-09-20",
      draftSubmittedAt: "2026-09-20",
    },
  ]);
  vi.mocked(readPlanDraft).mockRejectedValueOnce(new Error("offline"));
  await expect(loadPlanView({ userId: "c", role: "coach" })).rejects.toThrow(
    "offline",
  );
});
