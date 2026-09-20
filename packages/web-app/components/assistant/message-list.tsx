"use client";
import { useEffect, useRef } from "react";
import { Markdown } from "./markdown";
import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { useLocale, useT } from "@/components/i18n/provider";
import type { TaskProgress } from "./use-task-progress";
// Tools with one status label. startLongTask and publishPlanDocument vary by state.
const toolLabels = {
  getMyPlan: "tool.getMyPlan",
  saveOnboardingGoals: "tool.saveOnboardingGoals",
  listMyClients: "tool.listMyClients",
  getClientPlan: "tool.getClientPlan",
  listPlanDocuments: "tool.listPlanDocuments",
  readPlanDocument: "tool.readPlanDocument",
} as const;
function failedTask(part: UIMessage["parts"][number]) {
  return (
    isToolUIPart(part) &&
    (part.state === "output-error" ||
      part.state === "output-denied" ||
      (part.state === "output-available" &&
        typeof part.output === "string" &&
        part.output.startsWith("Background task failed:")))
  );
}
export function runningTaskIds(messages: UIMessage[]) {
  return messages.flatMap((message) =>
    message.parts.flatMap((part) =>
      isToolUIPart(part) &&
      getToolName(part) === "startLongTask" &&
      !failedTask(part) &&
      !(
        part.state === "output-available" &&
        (part.output as { status?: string } | undefined)?.status === "done"
      )
        ? [part.toolCallId]
        : [],
    ),
  );
}
export function hasRunningTask(messages: UIMessage[]) {
  return runningTaskIds(messages).length > 0;
}
export function MessageList({
  messages,
  greeting,
  progress,
  pending,
}: {
  messages: UIMessage[];
  greeting: string;
  progress: TaskProgress[];
  pending: boolean;
}) {
  const t = useT("assistant"),
    locale = useLocale();
  const log = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const lastUserId = messages.findLast((message) => message.role === "user")?.id;
  const previousUserId = useRef(lastUserId);
  useEffect(() => {
    if (lastUserId !== previousUserId.current) following.current = true;
    previousUserId.current = lastUserId;
    const node = log.current;
    if (node && following.current) node.scrollTop = node.scrollHeight;
  }, [messages, progress, pending, lastUserId]);
  return (
    <div
      ref={log}
      onScroll={(event) => {
        const node = event.currentTarget;
        following.current =
          node.scrollHeight - node.scrollTop - node.clientHeight <= 44;
      }}
      className="assistant-messages"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {!messages.length && <p className="assistant-message">{greeting}</p>}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`assistant-message assistant-message-${message.role}`}
        >
          {message.parts.map((part, index) => {
            if (part.type === "text")
              return <Markdown key={index} text={part.text} />;
            if (!isToolUIPart(part)) return null;
            const name = getToolName(part),
              failed = failedTask(part);
            const done = part.state === "output-available";
            const input = part.input as { kind?: string } | undefined;
            const output = done
              ? (part.output as { status?: string; kind?: string } | undefined)
              : undefined;
            const kind = input?.kind ?? output?.kind ?? "";
            const complete =
              name === "startLongTask" ? output?.status === "done" : done;
            const key =
              name === "publishPlanDocument"
                ? done
                  ? "tool.planPublished"
                  : "tool.publishPlanDocument"
                : toolLabels[name as keyof typeof toolLabels] ?? null;
            if (!key && name !== "startLongTask") return null;
            return (
              <span
                key={index}
                className={`assistant-status${complete ? " assistant-status-done" : ""}`}
              >
                {failed
                  ? t("tool.taskFailed")
                  : key
                    ? t(key)
                    : t(complete ? "tool.taskDone" : "tool.taskRunning", {
                        kind,
                      })}
              </span>
            );
          })}
        </div>
      ))}
      {progress.map((task) => (
        <span className="assistant-status" key={task.runId}>
          {t("tool.taskRunning", { kind: task.kind })}{" "}
          {t("progress.label", {
            percent: new Intl.NumberFormat(locale, { style: "percent" }).format(
              task.percent / 100,
            ),
          })}
        </span>
      ))}
      {pending && (
        <span className="assistant-status" role="status">
          {t("status.thinking")}
        </span>
      )}
    </div>
  );
}
