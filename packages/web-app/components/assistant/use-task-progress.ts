"use client";
import { useEffect, useState } from "react";
export type TaskProgress = { runId: string; kind: string; percent: number };
export function useTaskProgress(active: boolean, role: "coach" | "coachee") {
  const [completion, setCompletion] = useState(0);
  const [progress, setProgress] = useState<Record<string, TaskProgress>>({});
  useEffect(() => {
    if (!active) return;
    const source = new EventSource(`/api/assistant/tasks?portal=${role}`);
    source.addEventListener("progress", (event) => {
      try {
        const task = JSON.parse(event.data) as TaskProgress;
        if (
          typeof task.runId === "string" &&
          typeof task.kind === "string" &&
          Number.isFinite(task.percent)
        )
          setProgress((previous) => ({ ...previous, [task.runId]: task }));
      } catch {
        /* Ignore malformed events. */
      }
    });
    source.addEventListener("done", (event) => {
      try {
        const task = JSON.parse(event.data);
        setCompletion((value) => value + 1);
        setProgress((previous) => {
          const next = { ...previous };
          delete next[task.runId];
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
