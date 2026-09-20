"use client";
import { useRef } from "react";
import { useT } from "@/components/i18n/provider";
import { limits } from "@/lib/assistant/limits";
import { usePushToTalk } from "./use-push-to-talk";
export function Composer({
  role,
  value,
  onChange,
  onSend,
  disabled,
  voice,
  onVoiceToggle,
  onMicrophoneError,
}: {
  role: "coach" | "coachee";
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  disabled: boolean;
  voice: boolean;
  onVoiceToggle: () => void;
  onMicrophoneError: () => void;
}) {
  const t = useT("assistant");
  const recording = usePushToTalk((text) => {
    onChange(text);
    onSend(text);
  }, onMicrophoneError, role);
  const pressedAt = useRef(0),
    startedHere = useRef(false);
  return (
    <form
      className="assistant-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSend(value);
      }}
    >
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("composer.placeholder")}
        aria-label={t("composer.placeholder")}
        disabled={disabled}
        maxLength={limits.chatTextChars}
      />
      <button
        className="button button-primary"
        type="submit"
        disabled={disabled || !value.trim()}
      >
        {t("composer.send")}
      </button>
      {recording.supported && (
        <button
          className="assistant-icon"
          type="button"
          disabled={disabled || recording.transcribing}
          aria-label={t(
            recording.recording
              ? "composer.recordStop"
              : "composer.recordStart",
          )}
          aria-pressed={recording.recording}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            pressedAt.current = Date.now();
            startedHere.current = !recording.recording;
            if (recording.recording) recording.stop();
            else void recording.start();
          }}
          onPointerUp={() => {
            if (startedHere.current && Date.now() - pressedAt.current >= 250)
              recording.stop();
          }}
          onPointerCancel={recording.stop}
          onClick={(event) => {
            if (event.detail === 0) {
              if (recording.recording) recording.stop();
              else void recording.start();
            }
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" />
          </svg>
        </button>
      )}
      <button
        className="assistant-icon"
        type="button"
        aria-label={t(voice ? "composer.voiceOff" : "composer.voiceOn")}
        aria-pressed={voice}
        onClick={onVoiceToggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
        </svg>
      </button>
      {recording.transcribing && (
        <p role="status">{t("composer.transcribing")}</p>
      )}
    </form>
  );
}
