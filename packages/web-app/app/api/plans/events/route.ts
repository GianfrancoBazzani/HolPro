import { requireAssistantUser, unauthorized } from "@/lib/assistant/session";
import {
  sseComment,
  sseEvent,
  sseHeaders,
  sseHeartbeat,
} from "@/lib/assistant/sse";
import { subscribe } from "@/lib/plans/events";
import { canReadPlans } from "@/lib/plans/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const initial = await requireAssistantUser(request);
  if (!initial) return unauthorized();
  // Blocked or signed-out users lose the stream at the next event or heartbeat.
  const currentSession = async () => {
    const current = await requireAssistantUser(request);
    return current?.user.id === initial.user.id ? current : null;
  };
  let closed = false,
    checking = false;
  let unsubscribe = () => {},
    timer: ReturnType<typeof setInterval>;
  let close = () => {};
  const abort = () => close();
  const cleanup = () => {
    closed = true;
    unsubscribe();
    clearInterval(timer);
    request.signal.removeEventListener("abort", abort);
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      close = () => {
        if (!closed) {
          cleanup();
          controller.close();
        }
      };
      controller.enqueue(sseComment("connected"));
      unsubscribe = subscribe(initial.user.id, async (event) => {
        try {
          const current = await currentSession();
          if (!current) return close();
          const actor = { userId: current.user.id, role: current.role };
          if ((await canReadPlans(actor, event.engagementId)) && !closed)
            controller.enqueue(
              sseEvent("plan.published", {
                planId: event.planId,
                engagementId: event.engagementId,
              }),
            );
        } catch {
          close();
        }
      });
      timer = setInterval(() => {
        if (checking || closed) return;
        checking = true;
        void (async () => {
          try {
            if (!(await currentSession())) return close();
            if (!closed) controller.enqueue(sseHeartbeat);
          } catch {
            close();
          } finally {
            checking = false;
          }
        })();
      }, 25_000);
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) close();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, { headers: sseHeaders });
}
