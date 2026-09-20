"use client";
import { useEffect, useState } from "react";
export type TaskProgress = { runId: string; kind: string; percent: number };
function isTaskEvent(
  task: unknown,
): task is { runId: string; kind: string; percent?: unknown } {
  return (
    typeof task === "object" &&
    task !== null &&
    !Array.isArray(task) &&
    "runId" in task &&
    typeof task.runId === "string" &&
    "kind" in task &&
    typeof task.kind === "string"
  );
}
export function useTaskProgress(active: boolean, role: "coach" | "coachee") {
  const [completion, setCompletion] = useState(0);
  const [progress, setProgress] = useState<Record<string, TaskProgress>>({});
  useEffect(() => {
    if (!active) return;
    const source = new EventSource(`/api/assistant/tasks?portal=${role}`);
    source.addEventListener("progress", (event) => {
      try {
        const task: unknown = JSON.parse(event.data);
        if (
          isTaskEvent(task) &&
          typeof task.percent === "number" &&
          Number.isFinite(task.percent)
        ) {
          const progress = {
            runId: task.runId,
            kind: task.kind,
            percent: task.percent,
          };
          setProgress((previous) => ({ ...previous, [progress.runId]: progress }));
        }
      } catch {
        /* Ignore malformed events. */
      }
    });
    source.addEventListener("done", (event) => {
      try {
        const task: unknown = JSON.parse(event.data);
        if (!isTaskEvent(task)) return;
        const { runId } = task;
        setCompletion((value) => value + 1);
        setProgress((previous) => {
          const next = { ...previous };
          delete next[runId];
          return next;
        });
      } catch {
        /* Ignore malformed events. */
      }
    });
    return () => source.close();
  }, [active, role]);
  return { progress: active ? Object.values(progress) : [], completion };
}
