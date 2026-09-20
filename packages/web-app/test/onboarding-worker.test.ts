import { expect, it } from "vitest";
import { processOnboardingJob } from "../lib/onboarding/process";
import type { OnboardingJob } from "../lib/onboarding/repository";
const job = { id: "r", attempts: 1 } as OnboardingJob;
it("leaves failed generation retryable and never saves a draft", async () => {
  const events: string[] = [];
  await processOnboardingJob(job, {
    generate: async () => {
      throw Error("offline");
    },
    complete: async () => {
      events.push("draft");
      return true;
    },
    fail: async () => {
      events.push("retry");
    },
  });
  expect(events).toEqual(["retry"]);
});
it("saves generated output before completing the job", async () => {
  const saved: unknown[] = [];
  await processOnboardingJob(job, {
    generate: async () => ({ title: "Plan", html: "<p>Review me</p>" }),
    complete: async (_job, draft) => {
      saved.push(draft);
      return true;
    },
    fail: async () => {
      throw Error("unexpected retry");
    },
  });
  expect(saved).toEqual([{ title: "Plan", html: "<p>Review me</p>" }]);
});
