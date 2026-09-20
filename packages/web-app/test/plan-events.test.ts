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
