export type ActiveRun = { runId: string; kind: string; percent: number };
const globalRegistry = globalThis as typeof globalThis & {
  holproTaskRegistry?: Map<string, Set<ActiveRun>>;
};
const registry = (globalRegistry.holproTaskRegistry ??= new Map());
export function activeRuns(userId: string): ActiveRun[] {
  return [...(registry.get(userId) ?? [])];
}
export function registerRun(userId: string, run: ActiveRun) {
  const runs = registry.get(userId) ?? new Set<ActiveRun>();
  runs.add(run);
  registry.set(userId, runs);
  return () => {
    runs.delete(run);
    if (!runs.size) registry.delete(userId);
  };
}
// Workflow step writers emit custom output under payload.output.
export function progressPercent(event: unknown): number | undefined {
  if (!event || typeof event !== "object") return;
  const value = event as {
    type?: string;
    payload?: { output?: { percent?: unknown } };
  };
  const percent = value.payload?.output?.percent;
  if (
    value.type === "workflow-step-output" &&
    typeof percent === "number" &&
    Number.isFinite(percent)
  )
    return Math.max(0, Math.min(100, percent));
}
