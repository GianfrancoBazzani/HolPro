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
  publishEvent(event);
  expect(owner).toHaveBeenCalledWith(event);
  expect(stranger).not.toHaveBeenCalled();
  remove();
  publishEvent(event);
  expect(owner).toHaveBeenCalledOnce();
  other();
});
it("does not turn a committed publish into a failure when a listener throws", () => {
  const stop = subscribe("coach", () => {
    throw new Error("gone");
  });
  expect(() =>
    publishEvent({
      planId: "p",
      engagementId: "e",
      coachId: "coach",
      coacheeId: "u",
    }),
  ).not.toThrow();
  stop();
});

it.each([false, true])("reports subscriber failures and continues delivery (async: %s)", async (asyncFailure) => {
  const error = new Error("subscriber failed");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const delivered = vi.fn();
  const stopFailed = subscribe("coach", () => {
    if (asyncFailure) return Promise.reject(error);
    throw error;
  });
  const stopHealthy = subscribe("coach", delivered);
  try {
    const event = { planId: "p", engagementId: "e", coachId: "coach", coacheeId: "u" };
    expect(() => publishEvent(event)).not.toThrow();
    await Promise.resolve();
    expect(delivered).toHaveBeenCalledWith(event);
    expect(log).toHaveBeenCalledExactlyOnceWith("Plan event listener failed.", error);
  } finally {
    stopFailed();
    stopHealthy();
    log.mockRestore();
  }
});
