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
import { ConversationMenu, type Conversation } from "./conversation-menu";
import { useSpeaker } from "./use-speaker";
import { useTaskProgress } from "./use-task-progress";
import "./assistant.css";
const storageKey = "hp_assistant_expanded";
const threadKey = (role: string) => `hp_assistant_thread_${role}`;
function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Component state is enough when storage is unavailable. */
  }
}
function apiUrl(path: "chat" | "threads", role: string, thread?: string | null) {
  const params = new URLSearchParams({ portal: role });
  if (thread) params.set("thread", thread);
  return `/api/assistant/${path}?${params}`;
}
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
  timezone,
}: {
  name: string;
  role: "coachee" | "coach";
  onboarding: boolean;
  timezone: string;
}) {
  // null asks the server for the newest conversation; the answer names it in a header.
  const [activeThread, setActiveThread] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readStorage(threadKey(role)),
  );
  const [resolvedThread, setResolvedThread] = useState<string | null>(null);
  const thread = resolvedThread ?? activeThread;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsAttempt, setConversationsAttempt] = useState(0);
  const reloadConversations = useCallback(
    () => setConversationsAttempt((attempt) => attempt + 1),
    [],
  );
  const focusComposer = useRef(false);
  // Each send names its conversation in the request metadata, so a switched
  // conversation never rebuilds the transport.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl("chat", role),
        prepareSendMessagesRequest: ({ messages, requestMetadata }) => ({
          api: apiUrl(
            "chat",
            role,
            (requestMetadata as { thread?: string | null } | undefined)?.thread,
          ),
          body: {
            messages: messages
              .filter((message) => message.role === "user")
              .slice(-1),
          },
        }),
      }),
    [role],
  );
  const t = useT("assistant"),
    isOnboarding = role === "coachee" && onboarding;
  // The history is loaded when it belongs to the requested conversation.
  const [value, setValue] = useState(""),
    [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined),
    loaded = loadedFor === activeThread,
    [localError, setLocalError] = useState<
      "history" | "chat" | "speech" | "microphone" | "conversations" | null
    >(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [fallbackExpanded, setFallbackExpanded] = useState(isOnboarding);
  const expanded = useSyncExternalStore(
    subscribe,
    () => {
      const stored = readStorage(storageKey);
      return stored === null ? fallbackExpanded : stored === "true";
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
  // Every switch blanks the transcript until the history of the target loads.
  const selectThread = (id: string | null) => {
    writeStorage(threadKey(role), id);
    spoken.current = new Set();
    setMessages([]);
    setResolvedThread(id);
    setActiveThread(id);
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetch(apiUrl("chat", role, activeThread), { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401 && activeThread !== null) {
          // The stored conversation was deleted or is not ours: fall back.
          writeStorage(threadKey(role), null);
          setResolvedThread(null);
          setActiveThread(null);
          return;
        }
        if (!response.ok) throw new Error("history_failed");
        const resolved = response.headers.get("x-assistant-thread");
        const history = (await response.json()) as UIMessage[];
        if (controller.signal.aborted) return;
        if (resolved) {
          writeStorage(threadKey(role), resolved);
          setResolvedThread(resolved);
        }
        spoken.current = new Set(history.map((message) => message.id));
        setMessages(history);
        setLoadedFor(activeThread);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLocalError("history");
      });
    return () => {
      controller.abort();
      void stop();
    };
  }, [setMessages, stop, historyAttempt, role, activeThread]);
  useEffect(() => {
    if (!loaded || !focusComposer.current) return;
    focusComposer.current = false;
    panel.current
      ?.querySelector<HTMLTextAreaElement>(".assistant-field")
      ?.focus();
  }, [loaded]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(apiUrl("threads", role), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("conversations_failed");
        const list = (await response.json()) as Conversation[];
        if (!controller.signal.aborted) setConversations(list);
      })
      .catch(() => {
        // The open conversation stays usable; a failed list never hides
        // an error that the user still has to act on.
        if (!controller.signal.aborted)
          setLocalError((current) => current ?? "conversations");
      });
    return () => controller.abort();
  }, [role, conversationsAttempt]);
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
        const response = await fetch(apiUrl("chat", role, thread), {
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
  }, [runningTask, status, completion, setMessages, messages, role, thread]);
  // Ending the current generation before another turn or another conversation.
  // Deferred tools remain managed by Mastra and their results persist in the
  // thread that started them.
  const leaveTurn = async () => {
    turnVersion.current++;
    speaker.stop();
    setLocalError(null);
    if (status === "streaming" || status === "submitted") await stop();
  };
  const send = async (text: string) => {
    if (!text.trim() || !loaded || status === "submitted") return;
    await leaveTurn();
    setValue("");
    await sendMessage({ text: text.trim() }, { metadata: { thread } });
  };
  const createConversation = async () => {
    await leaveTurn();
    try {
      const response = await fetch(apiUrl("threads", role), { method: "POST" });
      if (!response.ok) throw new Error("create_failed");
      const { id } = (await response.json()) as { id: string };
      focusComposer.current = true;
      selectThread(id);
      reloadConversations();
    } catch {
      setLocalError("chat");
    }
  };
  const openConversation = async (id: string) => {
    if (id === thread) return;
    await leaveTurn();
    selectThread(id);
  };
  const deleteConversation = async (id: string) => {
    try {
      const response = await fetch(apiUrl("threads", role, id), {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete_failed");
      if (id === thread) {
        await leaveTurn();
        selectThread(null);
      }
      reloadConversations();
    } catch {
      setLocalError("chat");
    }
  };
  const errorKey =
    localError === "microphone" || localError === "conversations"
      ? (`error.${localError}` as const)
      : "error.generic";
  return (
    <aside ref={panel} className="dashboard-panel assistant-panel">
      <div className="assistant-header">
        <h2>{t("eyebrow")}</h2>
        <div className="assistant-header-actions">
          <ConversationMenu
            conversations={conversations}
            activeId={thread}
            timezone={timezone}
            onCreate={() => void createConversation()}
            onSelect={(id) => void openConversation(id)}
            onDelete={deleteConversation}
            onOpen={reloadConversations}
          />
          <button
            className="assistant-icon"
            type="button"
            aria-label={t(expanded ? "panel.collapse" : "panel.expand")}
            aria-expanded={expanded}
            onClick={() => {
              const next = !expanded;
              setFallbackExpanded(next);
              writeStorage(storageKey, String(next));
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
          <p>{t(errorKey)}</p>
          {localError !== "microphone" && (
            <button
              type="button"
              className="calendar-chip"
              onClick={async () => {
                setLocalError(null);
                if (localError === "conversations") {
                  reloadConversations();
                  return;
                }
                if (localError === "speech") {
                  void speaker.retry();
                  return;
                }
                await leaveTurn();
                if (!loaded) setHistoryAttempt((attempt) => attempt + 1);
                else if (messages.some((message) => message.role === "user")) {
                  void regenerate({ metadata: { thread } }).catch(() =>
                    setLocalError("chat"),
                  );
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
