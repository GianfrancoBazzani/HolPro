"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function PlanLive({ role }: { role: "coach" | "coachee" }) {
  const router = useRouter();
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(`/api/plans/events?portal=${role}`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        router.refresh();
      }, 150);
    };
    source.addEventListener("open", refresh);
    source.addEventListener("plan.published", refresh);
    return () => {
      clearTimeout(timer);
      source.removeEventListener("open", refresh);
      source.removeEventListener("plan.published", refresh);
      source.close();
    };
  }, [router, role]);
  return null;
}
