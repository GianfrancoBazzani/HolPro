import { randomUUID } from "node:crypto";
type Job = {
  kind: string;
  input: string;
  startedAt: number;
  durationMs: number;
};
const jobs = new Map<string, Job>();
export function submit(kind: string, input: string) {
  // Expire mock results after an hour; this backend intentionally is not durable.
  for (const [id, job] of jobs)
    if (Date.now() - job.startedAt > 3_600_000) jobs.delete(id);
  const configured = Number(process.env.MOCK_TASK_DURATION_MS ?? 120_000);
  const id = randomUUID();
  jobs.set(id, {
    kind,
    input,
    startedAt: Date.now(),
    durationMs:
      Number.isFinite(configured) && configured >= 0 ? configured : 120_000,
  });
  return id;
}
function jobFor(id: string) {
  const job = jobs.get(id);
  if (!job) throw new Error("Unknown mock job; the server may have restarted");
  return job;
}
export function status(id: string) {
  const job = jobFor(id),
    elapsed = Date.now() - job.startedAt;
  return {
    done: elapsed >= job.durationMs,
    percent:
      job.durationMs === 0
        ? 100
        : Math.min(
            100,
            Math.max(0, Math.floor((elapsed / job.durationMs) * 100)),
          ),
  };
}
export function result(id: string) {
  const job = jobFor(id);
  if (!status(id).done) throw new Error("Mock job is still running");
  return {
    kind: job.kind,
    result: `${job.kind}: ${job.input}`,
    durationMs: Date.now() - job.startedAt,
  };
}
