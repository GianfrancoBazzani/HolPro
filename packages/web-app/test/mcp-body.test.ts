import { expect, it } from "vitest";
import { boundedMcpRequest } from "../lib/mcp/body";
it("limits chunked bodies without a Content-Length header and cancels the producer", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(c) {
      c.enqueue(new Uint8Array(1024 * 1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("http://localhost/api/mcp", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
  expect(await boundedMcpRequest(request)).toBeNull();
  expect(cancelled).toBe(true);
});
it("preserves authenticated request data when copying a bounded body", async () => {
  const request = new Request("http://localhost/api/mcp", {
    method: "POST",
    body: "{}",
  });
  request.auth = { token: "x", clientId: "agent", scopes: ["plans:read"] };
  const copy = await boundedMcpRequest(request);
  expect(copy?.auth).toEqual(request.auth);
  expect(await copy?.text()).toBe("{}");
});
