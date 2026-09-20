// Bound streamed bodies as well as Content-Length before the SDK parses JSON.
import { limits } from "@/lib/assistant/limits";
export async function boundedMcpRequest(
  request: Request,
): Promise<Request | null> {
  const maxBytes = limits.mcpRequestBytes;
  if (Number(request.headers.get("content-length")) > maxBytes) return null;
  if (!request.body) return request;
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const copy = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bytes,
    signal: request.signal,
  });
  copy.auth = request.auth;
  return copy;
}
