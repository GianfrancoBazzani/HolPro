"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { useT } from "@/components/i18n/provider";
import { MessageList, hasRunningTask, runningTaskIds } from "./message-list";
import { toPlainText } from "@/lib/assistant/plain-text";
import { Composer } from "./composer";
import { useSpeaker } from "./use-speaker";
import { useTaskProgress } from "./use-task-progress";
import "./assistant.css";
const storageKey = "hp_assistant_expanded";
// The same-window storage write fires no storage event, so the click dispatches one.
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("assistant-expanded-change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("assistant-expanded-change", listener);
  };
}
export function AssistantPanel({
  name,
  role,
  onboarding,
}: {
  name: string;
  role: "coachee" | "coach";
  onboarding: boolean;
}) {
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: `/api/assistant/chat?portal=${role}`,
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages: messages.filter((message) => message.role === "user").slice(-1),
        },
      }),
    }),
    [role],
  );
  const t = useT("assistant"),
    isOnboarding = role === "coachee" && onboarding;
  const [value, setValue] = useState(""),
    [loaded, setLoaded] = useState(false),
    [localError, setLocalError] = useState<
      "history" | "chat" | "speech" | "microphone" | null
    >(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [fallbackExpanded, setFallbackExpanded] = useState(isOnboarding);
  const expanded = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const stored = localStorage.getItem(storageKey);
        return stored === null ? fallbackExpanded : stored === "true";
      } catch {
        return fallbackExpanded;
      }
    },
    () => isOnboarding,
  );
  const panel = useRef<HTMLElement>(null);
  const speaker = useSpeaker(
    useCallback(() => setLocalError("speech"), []),
    role,
  );
  const spoken = useRef(new Set<string>());
  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
  } = useChat({
    transport,
    onFinish: ({ message, isAbort, isError }) => {
      if (isAbort || isError || spoken.current.has(message.id)) return;
      spoken.current.add(message.id);
      speaker.speak(
        toPlainText(
          message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n"),
        ),
      );
    },
  });
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/assistant/chat?portal=${role}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("history_failed");
        const history = (await response.json()) as UIMessage[];
        if (controller.signal.aborted) return;
        history.forEach((message) => spoken.current.add(message.id));
        setMessages(history);
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLocalError("history");
      });
    return () => {
      controller.abort();
      void stop();
    };
  }, [setMessages, stop, historyAttempt, role]);
  useEffect(() => {
    const dashboard = panel.current?.closest(".dashboard");
    dashboard?.classList.toggle("assistant-expanded", expanded);
    return () => dashboard?.classList.remove("assistant-expanded");
  }, [expanded]);
  const runningTask = useMemo(
    () => loaded && hasRunningTask(messages),
    [loaded, messages],
  );
  const { progress, completion } = useTaskProgress(runningTask, role);
  const turnVersion = useRef(0);
  useEffect(() => {
    if (!runningTask || status === "streaming" || status === "submitted")
      return;
    const controller = new AbortController(),
      version = turnVersion.current;
    const waitingIds = runningTaskIds(messages);
    let timer: ReturnType<typeof setTimeout>;
    // A reopened tab has no generation stream. Reconcile persisted tool results,
    // retrying while Mastra finishes saving them after the registry emits done.
    const reconcile = async () => {
      try {
        const response = await fetch(`/api/assistant/chat?portal=${role}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("history_failed");
        const history = (await response.json()) as UIMessage[];
        if (controller.signal.aborted || version !== turnVersion.current)
          return;
        const storedIds = new Set(
          history.flatMap((message) =>
            message.parts.flatMap((part) =>
              isToolUIPart(part) ? [part.toolCallId] : [],
            ),
          ),
        );
        if (
          waitingIds.every((id) => storedIds.has(id)) &&
          !hasRunningTask(history)
        ) {
          setMessages(history);
          return;
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      timer = setTimeout(() => void reconcile(), 2000);
    };
    timer = setTimeout(() => void reconcile(), completion ? 250 : 2000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [runningTask, status, completion, setMessages, messages, role]);
  const send = async (text: string) => {
    if (!text.trim() || !loaded || status === "submitted") return;
    turnVersion.current++;
    speaker.stop();
    setLocalError(null);
    setValue("");
    // End the current generation before starting another turn. Deferred tools
    // remain managed by Mastra and their results persist in the same thread.
    if (status === "streaming") await stop();
    await sendMessage({ text: text.trim() });
  };
  return (
    <aside ref={panel} className="dashboard-panel assistant-panel">
      <div className="assistant-header">
        <h2>{t("eyebrow")}</h2>
        <button
          className="assistant-icon"
          type="button"
          aria-label={t(expanded ? "panel.collapse" : "panel.expand")}
          aria-expanded={expanded}
          onClick={() => {
            const next = !expanded;
            setFallbackExpanded(next);
            try {
              localStorage.setItem(storageKey, String(next));
            } catch {
              /* Use component state when storage is unavailable. */
            }
            window.dispatchEvent(new Event("assistant-expanded-change"));
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d={
                expanded
                  ? "m5 5 7 7-7 7m7-14 7 7-7 7"
                  : "m19 5-7 7 7 7m-7-14-7 7 7 7"
              }
            />
          </svg>
        </button>
      </div>
      <MessageList
        messages={messages}
        greeting={t(isOnboarding ? "greeting.onboarding" : "greeting.default", {
          name,
        })}
        progress={progress}
        pending={status === "submitted"}
      />
      <Composer
        role={role}
        value={value}
        onChange={setValue}
        onSend={(text) => void send(text)}
        disabled={!loaded || status === "submitted"}
        voice={speaker.enabled}
        onVoiceToggle={() => {
          if (localError === "speech") setLocalError(null);
          speaker.toggle();
        }}
        onMicrophoneError={() => setLocalError("microphone")}
      />
      {(error || localError) && (
        <div className="assistant-error" role="alert">
          <p>
            {t(localError === "microphone" ? "error.microphone" : "error.generic")}
          </p>
          {localError !== "microphone" && (
            <button
              type="button"
              className="calendar-chip"
              onClick={() => {
                setLocalError(null);
                if (localError === "speech") {
                  void speaker.retry();
                  return;
                }
                turnVersion.current++;
                speaker.stop();
                if (!loaded) setHistoryAttempt((attempt) => attempt + 1);
                else if (messages.some((message) => message.role === "user")) {
                  void regenerate().catch(() => setLocalError("chat"));
                }
              }}
            >
              {t("error.retry")}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
