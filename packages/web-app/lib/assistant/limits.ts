// One source for the client hints, the route checks and the zod rules.
// deploy/nginx.example.conf mirrors the request byte limits.
const MiB = 1024 * 1024;
export const limits = {
  chatTextChars: 16_000,
  speechTextChars: 2000,
  audioBytes: 10 * MiB,
  audioRequestBytes: 11 * MiB,
  mcpRequestBytes: 16 * MiB,
  jsonRequestBytes: 8 * 1024,
} as const;
