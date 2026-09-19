import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/auth/gate", () => ({ requirePortalUser: vi.fn() }));
vi.mock("../lib/i18n/request", () => ({ currentLocale: async () => "en" }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
const storage = vi.hoisted(() => ({
  rows: [] as { id: string }[],
  writes: [] as unknown[],
  fail: false,
}));
vi.mock("@holpro/db", async () => ({
  ...(await import("@holpro/db/schema")),
  db: {
    select: () => {
      const q = {
        from: () => q,
        innerJoin: () => q,
        where: () => q,
        limit: async () => storage.rows,
      };
      return q;
    },
    insert: () => ({
      values: async (value: unknown) => {
        if (storage.fail) throw Error();
        storage.writes.push(value);
      },
    }),
    update: () => ({
      set: (value: unknown) => ({
        where: async () => {
          if (storage.fail) throw Error();
          storage.writes.push(value);
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        if (storage.fail) throw Error();
        storage.writes.push("delete");
      },
    }),
  },
}));
import { requirePortalUser } from "../lib/auth/gate";
import { refresh } from "next/cache";
import { saveAgendaEvent, deleteAgendaEvent } from "../lib/pro/agenda-actions";
import {
  savePlanItem,
  deletePlanItem,
  savePlanCheckpoint,
  deletePlanCheckpoint,
  savePlanPeriod,
  deletePlanPeriod,
} from "../lib/pro/plan-actions";
const id = "11111111-1111-4111-8111-111111111111";
const form = (value: Record<string, string>) => {
  const f = new FormData();
  Object.entries(value).forEach(([k, v]) => f.set(k, v));
  return f;
};
const cases = [
  [
    saveAgendaEvent,
    {
      id,
      title: "Call",
      kind: "call",
      date: "2026-09-19",
      time: "15:00",
      durationMinutes: "60",
      engagementId: "",
    },
  ],
  [savePlanItem, { id, title: "Plan", kind: "training" }],
  [
    savePlanCheckpoint,
    { id, title: "Check", date: "2026-09-19", status: "done" },
  ],
  [
    savePlanPeriod,
    { id, title: "Phase", startDate: "2026-09-19", endDate: "2026-09-20" },
  ],
  [deleteAgendaEvent, { id }],
  [deletePlanItem, { id }],
  [deletePlanCheckpoint, { id }],
  [deletePlanPeriod, { id }],
] as const;
beforeEach(() => {
  vi.clearAllMocks();
  storage.rows = [{ id }];
  storage.writes = [];
  storage.fail = false;
  vi.mocked(requirePortalUser).mockResolvedValue({
    id: "coach",
    timezone: "Europe/Rome",
  } as Awaited<ReturnType<typeof requirePortalUser>>);
});
for (const [action, payload] of cases) {
  it(`${action.name} denies missing ownership without writing`, async () => {
    storage.rows = [];
    expect(await action({}, form(payload))).toMatchObject({ ok: false });
    expect(storage.writes).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });
  it(`${action.name} writes and refreshes only on success`, async () => {
    expect(await action({}, form(payload))).toEqual({ ok: true });
    expect(storage.writes).toHaveLength(1);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it(`${action.name} returns database errors`, async () => {
    storage.fail = true;
    expect(await action({}, form(payload))).toMatchObject({
      ok: false,
      error: expect.any(String),
    });
    expect(refresh).not.toHaveBeenCalled();
  });
  it(`${action.name} propagates gate redirects`, async () => {
    vi.mocked(requirePortalUser).mockRejectedValue(Error("redirect"));
    await expect(action({}, form(payload))).rejects.toThrow("redirect");
    expect(storage.writes).toEqual([]);
  });
}
it("uses coach timezone and ignores forged identity", async () => {
  await saveAgendaEvent({}, form({ ...cases[0][1], coachId: "foreign" }));
  expect(storage.writes[0]).toMatchObject({
    startsAt: new Date("2026-09-19T13:00:00Z"),
  });
  expect(storage.writes[0]).not.toHaveProperty("coachId");
});
it("never moves edited items to a submitted engagement", async () => {
  await savePlanItem({}, form({ ...cases[1][1], engagementId: id }));
  expect(storage.writes[0]).not.toHaveProperty("engagementId");
});
it("translates validation failures before writing", async () => {
  expect(
    await saveAgendaEvent({}, form({ ...cases[0][1], title: "" })),
  ).toMatchObject({ fields: { title: ["Enter a title."] } });
  expect(storage.writes).toEqual([]);
});
it("creates events only for the gated coach and refuses a foreign client", async () => {
  const payload = { ...cases[0][1], id: "" };
  await saveAgendaEvent({}, form({ ...payload, coachId: "foreign" }));
  expect(storage.writes[0]).toMatchObject({ coachId: "coach" });
  storage.writes = [];
  storage.rows = [];
  expect(
    await saveAgendaEvent({}, form({ ...payload, engagementId: id })),
  ).toMatchObject({ ok: false });
  expect(storage.writes).toEqual([]);
});
it("creates plan children under the checked parent and never moves edits", async () => {
  const payload = { ...cases[2][1], id: "" };
  await savePlanCheckpoint({}, form({ ...payload, itemId: id }));
  expect(storage.writes[0]).toMatchObject({ itemId: id });
  storage.writes = [];
  await savePlanCheckpoint({}, form({ ...payload, id, itemId: id }));
  expect(storage.writes[0]).not.toHaveProperty("itemId");
});
