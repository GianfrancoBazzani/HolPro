import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/auth/gate", () => ({
  requirePortalUser: vi.fn(async () => ({ id: "coach" })),
}));
vi.mock("../lib/i18n/request", () => ({ currentLocale: async () => "en" }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("../lib/pro/ownership", () => ({
  ownsPlanDocument: vi.fn(async () => true),
}));
vi.mock("../lib/plans/repository", () => ({
  approvePlanDraft: vi.fn(),
  discardPlanDraft: vi.fn(),
}));
import { ownsPlanDocument } from "../lib/pro/ownership";
import * as repository from "../lib/plans/repository";
import { PlanDraftChangedError } from "../lib/plans/types";
import {
  approvePlanDraft,
  discardPlanDraft,
} from "../lib/pro/plan-document-actions";
import { refresh } from "next/cache";
const id = "11111111-1111-4111-8111-111111111111",
  draftId = "22222222-2222-4222-8222-222222222222";
const form = () => {
  const f = new FormData();
  f.set("id", id);
  f.set("draftId", draftId);
  return f;
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ownsPlanDocument).mockResolvedValue(true);
});
for (const [action, write] of [
  [approvePlanDraft, repository.approvePlanDraft],
  [discardPlanDraft, repository.discardPlanDraft],
] as const) {
  it(`${action.name} checks ownership and sends the reviewed draft id`, async () => {
    expect(await action({}, form())).toEqual({ ok: true });
    expect(write).toHaveBeenCalledWith("coach", id, draftId);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it(`${action.name} denies another coach`, async () => {
    vi.mocked(ownsPlanDocument).mockResolvedValue(false);
    expect(await action({}, form())).toMatchObject({ ok: false });
    expect(write).not.toHaveBeenCalled();
  });
  it(`${action.name} rejects missing draft ids`, async () => {
    const f = form();
    f.delete("draftId");
    expect(await action({}, f)).toHaveProperty("fields.draftId");
    expect(write).not.toHaveBeenCalled();
  });
  it(`${action.name} refreshes and explains a stale draft`, async () => {
    vi.mocked(write).mockRejectedValueOnce(new PlanDraftChangedError());
    expect(await action({}, form())).toEqual({
      ok: false,
      error: "This draft has changed. Review the latest preview and try again.",
    });
    expect(refresh).toHaveBeenCalledOnce();
  });
}
