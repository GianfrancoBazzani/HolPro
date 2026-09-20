"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/provider";
export function PlanViewer({ framed }: { framed: string }) {
  const iframe = useRef<HTMLIFrameElement>(null),
    [height, setHeight] = useState(480),
    t = useT("dashboard");
  useEffect(() => {
    const resize = (event: MessageEvent) => {
      if (
        event.source !== iframe.current?.contentWindow ||
        event.data?.type !== "holpro:height" ||
        typeof event.data.value !== "number" ||
        !Number.isFinite(event.data.value)
      )
        return;
      setHeight(Math.min(20_000, Math.max(480, event.data.value)));
    };
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, []);
  return (
    <iframe
      ref={iframe}
      className="plan-frame"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={framed}
      title={t("plan.frameTitle")}
      style={{ height }}
    />
  );
}
