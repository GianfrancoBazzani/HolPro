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
export function publishEvent(event: PlanPublished) {
  events.emit("plan.published", event);
}
export function subscribe(
  userId: string,
  listener: (event: PlanPublished) => void | Promise<void>,
) {
  const filtered = (event: PlanPublished) => {
    if (event.coachId === userId || event.coacheeId === userId) {
      try {
        void Promise.resolve(listener(event)).catch(() => {});
      } catch {
        /* A disconnected subscriber cannot roll back a publication. */
      }
    }
  };
  events.on("plan.published", filtered);
  return () => {
    events.off("plan.published", filtered);
  };
}
