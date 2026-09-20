"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { limits } from "@/lib/assistant/limits";
const subscribe = () => () => {};
export function usePushToTalk(
  onTranscript: (text: string) => void,
  onError: () => void,
  role: "coach" | "coachee",
) {
  const supported = useSyncExternalStore(
    subscribe,
    () =>
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );
  const [recording, setRecording] = useState(false),
    [transcribing, setTranscribing] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    wanted = useRef(false),
    alive = useRef(true);
  const abort = useRef<AbortController | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbacks = useRef({ onTranscript, onError });
  useEffect(() => {
    callbacks.current = { onTranscript, onError };
  }, [onTranscript, onError]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      wanted.current = false;
      clearTimeout(timer.current);
      abort.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  const stop = useCallback(() => {
    wanted.current = false;
    clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (alive.current) setRecording(false);
  }, []);
  const start = useCallback(async () => {
    if (wanted.current || transcribing) return;
    wanted.current = true;
    setRecording(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!wanted.current || !alive.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("recording_unsupported");
      const capture = new MediaRecorder(media, { mimeType });
      recorder.current = capture;
      const chunks: Blob[] = [];
      let size = 0;
      capture.ondataavailable = (event) => {
        chunks.push(event.data);
        size += event.data.size;
        if (size >= limits.audioBytes) stop();
      };
      capture.onerror = () => {
        stop();
        callbacks.current.onError();
      };
      capture.onstop = async () => {
        media.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (!alive.current) return;
        setRecording(false);
        setTranscribing(true);
        const controller = new AbortController();
        abort.current = controller;
        try {
          if (!size || size > limits.audioBytes)
            throw new Error("invalid_recording");
          const form = new FormData();
          form.append(
            "audio",
            new Blob(chunks, { type: mimeType }),
            mimeType.includes("mp4") ? "voice.mp4" : "voice.webm",
          );
          const response = await fetch(`/api/assistant/transcribe?portal=${role}`, {
            method: "POST",
            body: form,
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("transcription_failed");
          const { text } = await response.json();
          if (alive.current && typeof text === "string" && text.trim())
            callbacks.current.onTranscript(text);
        } catch {
          if (alive.current && !controller.signal.aborted)
            callbacks.current.onError();
        } finally {
          if (alive.current) setTranscribing(false);
        }
      };
      capture.start(1000);
      timer.current = setTimeout(stop, 120_000);
    } catch {
      wanted.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      if (alive.current) {
        setRecording(false);
        callbacks.current.onError();
      }
    }
  }, [stop, transcribing, role]);
  return { supported, recording, transcribing, start, stop };
}
