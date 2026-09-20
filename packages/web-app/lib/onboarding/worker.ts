import {
  claimOnboarding,
  completeOnboarding,
  failOnboarding,
} from "./repository";
import { processOnboardingJob } from "./process";
import {
  claimNotification,
  finishNotification,
} from "@/lib/notifications/repository";
// Database leases coordinate replicas. Timers only wake workers; all work and
// retry state lives in MySQL, so a restart cannot erase a request.
const globalWorker = globalThis as typeof globalThis & {
  holproOnboardingWorker?: ReturnType<typeof setInterval>;
};
// One lane per queue: a tick is skipped while the previous one still runs.
function lane(message: string, run: () => Promise<void>) {
  let busy = false;
  return () => {
    if (busy) return;
    busy = true;
    void run()
      .catch(() => console.error(message))
      .finally(() => {
        busy = false;
      });
  };
}
export function startOnboardingWorker() {
  if (globalWorker.holproOnboardingWorker) return;
  const prepare = lane(
    "Onboarding worker failed; persisted work will be retried.",
    async () => {
      const job = await claimOnboarding();
      if (!job) return;
      // Loaded here so the agent runtime stays off the server startup path.
      const { generateOnboardingDraft } =
        await import("@/mastra/agents/coach-intake");
      await processOnboardingJob(job, {
        generate: generateOnboardingDraft,
        complete: completeOnboarding,
        fail: failOnboarding,
      });
    },
  );
  const deliver = lane(
    "Notification worker failed; persisted work will be retried.",
    async () => {
      const notification = await claimNotification();
      if (!notification) return;
      let success = false;
      try {
        const { deliverNotification } =
          await import("@/lib/notifications/delivery");
        await deliverNotification(notification);
        success = true;
      } catch {
        /* Retry separately from draft generation. */
      }
      await finishNotification(notification, success);
    },
  );
  const tick = () => {
    prepare();
    deliver();
  };
  globalWorker.holproOnboardingWorker = setInterval(tick, 5000);
  globalWorker.holproOnboardingWorker.unref();
  tick();
}
