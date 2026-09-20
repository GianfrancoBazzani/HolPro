const encoder = new TextEncoder();
export const sseHeaders = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
} as const;
export const sseComment = (text: string) => encoder.encode(`: ${text}\n\n`);
export const sseHeartbeat = sseComment("heartbeat");
export const sseEvent = (type: string, data: unknown) =>
  encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
export function withSseHeartbeat(response: Response, intervalMs = 15_000) {
  if (!response.body) return response;
  const reader = response.body.getReader();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      timer = setInterval(() => {
        if (!closed) controller.enqueue(sseHeartbeat);
      }, intervalMs);
      void (async () => {
        try {
          while (!closed) {
            const { value, done } = await reader.read();
            if (closed) break;
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          if (!closed) controller.error(error);
        } finally {
          closed = true;
          clearInterval(timer);
          reader.releaseLock();
        }
      })();
    },
    async cancel(reason) {
      closed = true;
      clearInterval(timer);
      await reader.cancel(reason);
    },
  });
  const headers = new Headers(response.headers);
  headers.set("cache-control", sseHeaders["cache-control"]);
  headers.set("x-accel-buffering", sseHeaders["x-accel-buffering"]);
  return new Response(stream, { status: response.status, headers });
}
