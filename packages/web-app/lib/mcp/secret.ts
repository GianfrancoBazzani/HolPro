export function mcpSecret(): Uint8Array {
  const value = process.env.MCP_TOKEN_SECRET ?? "";
  const bytes = Buffer.from(value, "base64");
  if (!value || bytes.length < 32 || bytes.toString("base64") !== value)
    throw new Error(
      "MCP_TOKEN_SECRET must be canonical base64 encoding at least 32 random bytes.",
    );
  return bytes;
}
