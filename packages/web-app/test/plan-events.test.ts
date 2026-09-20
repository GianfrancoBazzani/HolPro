import { expect, it, vi } from "vitest";
import { publishEvent, subscribe } from "../lib/plans/events";
it("isolates listeners by participant and unsubscribes", () => {
  const owner = vi.fn(),
    stranger = vi.fn();
  const remove = subscribe("coach", owner),
    other = subscribe("foreign", stranger);
  const event = {
    planId: "p",
    engagementId: "e",
    coachId: "coach",
    coacheeId: "coachee",
  };
  publishEvent("plan.published", event);
  expect(owner).toHaveBeenCalledWith("plan.published", event);
  expect(stranger).not.toHaveBeenCalled();
  remove();
  publishEvent("plan.published", event);
  expect(owner).toHaveBeenCalledOnce();
  other();
});
it("does not turn a committed publish into a failure when a listener throws", () => {
  const stop = subscribe("coach", () => {
    throw new Error("gone");
  });
  expect(() =>
    publishEvent("plan.published", {
      planId: "p",
      engagementId: "e",
      coachId: "coach",
      coacheeId: "u",
    }),
  ).not.toThrow();
  stop();
});

it.each([false, true])(
  "reports subscriber failures and continues delivery (async: %s)",
  async (asyncFailure) => {
    const error = new Error("subscriber failed");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const delivered = vi.fn();
    const stopFailed = subscribe("coach", () => {
      if (asyncFailure) return Promise.reject(error);
      throw error;
    });
    const stopHealthy = subscribe("coach", delivered);
    try {
      const event = {
        planId: "p",
        engagementId: "e",
        coachId: "coach",
        coacheeId: "u",
      };
      expect(() => publishEvent("plan.published", event)).not.toThrow();
      await Promise.resolve();
      expect(delivered).toHaveBeenCalledWith("plan.published", event);
      expect(log).toHaveBeenCalledExactlyOnceWith(
        "Plan event listener failed.",
        error,
      );
    } finally {
      stopFailed();
      stopHealthy();
      log.mockRestore();
    }
  },
);

it("keeps calendar drafts private and delivers approval to both participants", () => {
  const coach=vi.fn(), client=vi.fn();
  const stopCoach=subscribe("coach",coach), stopClient=subscribe("client",client);
  const event={planId:null,engagementId:"e",coachId:"coach",coacheeId:"client"};
  try {
    publishEvent("plan.draft",event);
    expect(coach).toHaveBeenCalledWith("plan.draft",event);
    expect(client).not.toHaveBeenCalled();
    publishEvent("plan.published",event);
    expect(client).toHaveBeenCalledWith("plan.published",event);
  } finally {stopCoach();stopClient();}
});
