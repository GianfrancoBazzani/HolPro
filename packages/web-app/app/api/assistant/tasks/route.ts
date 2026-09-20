import { requireAssistantUser, unauthorized } from "@/lib/assistant/session";
import { sseEvent, sseHeaders, sseHeartbeat } from "@/lib/assistant/sse";
import { activeRuns } from "@/mastra/backend/registry";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  // The tool that started each run keeps its registry percent current.
  const known = new Map<string, { kind: string; percent: number }>();
  let timer: ReturnType<typeof setInterval>,
    heartbeat: ReturnType<typeof setInterval>;
  let idleSince = Date.now(),
    closed = false;
  let closeStream: () => void;
  const cleanup = () => {
    closed = true;
    clearInterval(timer);
    clearInterval(heartbeat);
    request.signal.removeEventListener("abort", abort);
  };
  const abort = () => closeStream?.();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      closeStream = () => {
        if (!closed) {
          cleanup();
          controller.close();
        }
      };
      const poll = () => {
        if (closed) return;
        const runs = activeRuns(session.user.id),
          ids = new Set(runs.map((r) => r.runId));
        if (runs.length) idleSince = Date.now();
        for (const run of runs) {
          if (known.get(run.runId)?.percent === run.percent) continue;
          known.set(run.runId, { kind: run.kind, percent: run.percent });
          controller.enqueue(sseEvent("progress", run));
        }
        for (const [runId, value] of known)
          if (!ids.has(runId)) {
            controller.enqueue(sseEvent("done", { runId, kind: value.kind }));
            known.delete(runId);
          }
        if (!runs.length && Date.now() - idleSince >= 60_000) closeStream();
      };
      timer = setInterval(poll, 2000);
      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(sseHeartbeat);
      }, 15_000);
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) closeStream();
      else poll();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, { headers: sseHeaders });
}
