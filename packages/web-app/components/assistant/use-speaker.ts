"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { limits } from "@/lib/assistant/limits";
export function useSpeaker(onError: () => void, role: "coach" | "coachee") {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false),
    queue = useRef<string[]>([]),
    busy = useRef(false),
    generation = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null),
    url = useRef<string | null>(null),
    controller = useRef<AbortController | null>(null);
  const finish = useRef<(() => void) | null>(null);
  const errorRef = useRef(onError);
  useEffect(() => {
    errorRef.current = onError;
  }, [onError]);
  const stop = useCallback(() => {
    generation.current++;
    queue.current = [];
    controller.current?.abort();
    audio.current?.pause();
    finish.current?.();
    if (url.current) URL.revokeObjectURL(url.current);
    audio.current = null;
    url.current = null;
    busy.current = false;
  }, []);
  useEffect(() => stop, [stop]);
  const drain = useCallback(async () => {
    if (busy.current || !enabledRef.current) return;
    busy.current = true;
    const version = generation.current;
    try {
      while (
        queue.current.length &&
        enabledRef.current &&
        version === generation.current
      ) {
        // Keep the current chunk until playback succeeds so retry is audio-only.
        const text = queue.current[0];
        const abort = new AbortController();
        controller.current = abort;
        const response = await fetch(`/api/assistant/speak?portal=${role}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abort.signal,
        });
        if (!response.ok) throw new Error("speech_failed");
        const blob = await response.blob();
        if (version !== generation.current) break;
        const objectUrl = URL.createObjectURL(blob);
        url.current = objectUrl;
        const player = new Audio(objectUrl);
        audio.current = player;
        try {
          await new Promise<void>((resolve, reject) => {
            finish.current = resolve;
            player.onended = () => resolve();
            player.onerror = () => reject(new Error("playback_failed"));
            void player.play().catch(reject);
          });
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
        if (version === generation.current) queue.current.shift();
      }
    } catch {
      if (version === generation.current) {
        errorRef.current();
      }
    } finally {
      if (version === generation.current) {
        busy.current = false;
        audio.current = null;
        url.current = null;
        finish.current = null;
      }
    }
  }, [role]);
  const speak = useCallback(
    (text: string) => {
      if (!enabledRef.current) return;
      const chunk = limits.speechTextChars;
      for (let offset = 0; offset < text.length; offset += chunk)
        queue.current.push(text.slice(offset, offset + chunk));
      void drain();
    },
    [drain],
  );
  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    if (!enabledRef.current) stop();
  }, [stop]);
  return { enabled, toggle, speak, stop, retry: drain };
}
