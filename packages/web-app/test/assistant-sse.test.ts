import { expect, it, vi } from "vitest";
import { withSseHeartbeat } from "../lib/assistant/sse";
it("adds heartbeats and cancels its source on disconnect", async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const response = withSseHeartbeat(
    new Response(new ReadableStream({ cancel }), {
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
    }),
    15,
  );
  const reader = response.body!.getReader();
  const pending = reader.read();
  await vi.advanceTimersByTimeAsync(15);
  expect(new TextDecoder().decode((await pending).value)).toBe(
    ": heartbeat\n\n",
  );
  await reader.cancel();
  expect(cancel).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
});
