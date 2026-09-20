// Bound streamed bodies as well as Content-Length, for every route that parses
// a request body. Returns null when the request exceeds the limit.
export async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(request.headers.get("content-length")) > maxBytes) return null;
  if (!request.body) return new Uint8Array(new ArrayBuffer(0));
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
  const bytes = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
