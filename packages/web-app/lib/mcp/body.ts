import { limits } from "@/lib/assistant/limits";
import { readBoundedBody } from "@/lib/http/bounded-body";
export async function boundedMcpRequest(
  request: Request,
): Promise<Request | null> {
  if (!request.body) return request;
  const bytes = await readBoundedBody(request, limits.mcpRequestBytes);
  if (!bytes) return null;
  const copy = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bytes,
    signal: request.signal,
  });
  copy.auth = request.auth;
  return copy;
}
