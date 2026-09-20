"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import type { Conversation } from "@/lib/assistant/conversations";
export type { Conversation };
export function ConversationList({
  conversations,
  activeId,
  timezone,
  confirming,
  busy,
  onSelect,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  timezone: string;
  confirming: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const t = useT("assistant"),
    dateFormat = new Intl.DateTimeFormat(useLocale(), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    });
  if (!conversations.length)
    return (
      <p className="assistant-conversation-empty">{t("conversation.empty")}</p>
    );
  return (
    <ul className="assistant-conversation-rows">
      {conversations.map((conversation) => {
        const current = conversation.id === activeId;
        if (confirming === conversation.id)
          return (
            <li
              key={conversation.id}
              className="assistant-conversation assistant-conversation-confirm"
            >
              <p>{t("conversation.deleteQuestion")}</p>
              <button
                type="button"
                className="calendar-chip"
                disabled={busy}
                aria-busy={busy}
                onClick={() => onConfirmDelete(conversation.id)}
              >
                {t("conversation.deleteConfirm")}
              </button>
              <button
                type="button"
                className="calendar-chip"
                disabled={busy}
                onClick={onCancelDelete}
              >
                {t("conversation.deleteCancel")}
              </button>
            </li>
          );
        return (
          <li key={conversation.id} className="assistant-conversation">
            <button
              type="button"
              className="assistant-conversation-open"
              aria-current={current ? "true" : undefined}
              onClick={() => onSelect(conversation.id)}
            >
              {current && (
                <svg
                  className="assistant-conversation-check"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m5 12 5 5L20 7" />
                </svg>
              )}
              <span className="assistant-conversation-title">
                {conversation.title ?? t("conversation.untitled")}
              </span>
              {current && (
                <span className="assistant-hidden">
                  {t("conversation.current")}
                </span>
              )}
              <time dateTime={conversation.updatedAt}>
                {dateFormat.format(new Date(conversation.updatedAt))}
              </time>
            </button>
            <button
              type="button"
              className="assistant-icon assistant-conversation-delete"
              aria-label={t("conversation.delete")}
              onClick={() => onAskDelete(conversation.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
export function ConversationMenu({
  conversations,
  activeId,
  timezone,
  onSelect,
  onCreate,
  onDelete,
  onOpen,
}: {
  conversations: Conversation[];
  activeId: string | null;
  timezone: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => Promise<void>;
  onOpen: () => void;
}) {
  const t = useT("assistant"),
    id = useId();
  const [open, setOpen] = useState(false),
    [confirming, setConfirming] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    setConfirming(null);
    if (focusTrigger) trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);
  return (
    <div ref={root} className="assistant-conversations">
      <button
        className="assistant-icon"
        type="button"
        aria-label={t("conversation.new")}
        onClick={onCreate}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button
        ref={trigger}
        className="assistant-icon"
        type="button"
        aria-label={t("conversation.history")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (open) return close(false);
          setOpen(true);
          onOpen();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div
          id={id}
          className="assistant-conversation-list"
          role="group"
          aria-label={t("conversation.history")}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            timezone={timezone}
            confirming={confirming}
            busy={busy}
            onSelect={(selected) => {
              close(true);
              onSelect(selected);
            }}
            onAskDelete={setConfirming}
            onCancelDelete={() => setConfirming(null)}
            onConfirmDelete={async (target) => {
              setBusy(true);
              try {
                await onDelete(target);
              } finally {
                setBusy(false);
                setConfirming(null);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
