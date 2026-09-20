export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production"
  ) {
    const { mcpSecret } = await import("./lib/mcp/secret");
    mcpSecret();
  }
}
