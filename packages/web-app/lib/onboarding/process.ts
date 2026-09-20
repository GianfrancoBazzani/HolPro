import type { OnboardingJob } from "./repository";
export async function processOnboardingJob(
  job: OnboardingJob,
  work: {
    generate: (job: OnboardingJob) => Promise<{ title: string; html: string }>;
    complete: (
      job: OnboardingJob,
      draft: { title: string; html: string },
    ) => Promise<boolean>;
    fail: (job: OnboardingJob) => Promise<void>;
  },
) {
  try {
    await work.complete(job, await work.generate(job));
  } catch {
    await work.fail(job);
  }
}
