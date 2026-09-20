import { EventEmitter } from "node:events";
export type PlanPublished = {
  planId: string;
  engagementId: string;
  coachId: string;
  coacheeId: string;
};
const globalEvents = globalThis as typeof globalThis & {
  holproPlanEvents?: EventEmitter;
};
const events = (globalEvents.holproPlanEvents ??= new EventEmitter());
events.setMaxListeners(0);
export type PlanEventName = "plan.published" | "plan.draft";
export function publishEvent(name: PlanEventName, event: PlanPublished) {
  events.emit(name, event);
}
export function subscribe(
  userId: string,
  listener: (name: PlanEventName, event: PlanPublished) => void | Promise<void>,
) {
  const handle = (name: PlanEventName) => (event: PlanPublished) => {
    if (
      event.coachId !== userId &&
      (name === "plan.draft" || event.coacheeId !== userId)
    )
      return;
    const reportFailure = (error: unknown) =>
      console.error("Plan event listener failed.", error);
    try {
      void Promise.resolve(listener(name, event)).catch(reportFailure);
    } catch (error) {
      reportFailure(error);
    }
  };
  const published = handle("plan.published"),
    draft = handle("plan.draft");
  events.on("plan.published", published);
  events.on("plan.draft", draft);
  return () => {
    events.off("plan.published", published);
    events.off("plan.draft", draft);
  };
}
