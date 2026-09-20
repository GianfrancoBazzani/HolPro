export async function registerNode() {
  if (process.env.NODE_ENV === "production") {
    const { mcpSecret } = await import("./lib/mcp/secret");
    mcpSecret();
  }
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    !process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_MODE !== "polling"
  )
    return;
  const { getTelegramRuntime, stopTelegramRuntime } = await import(
    "./lib/telegram/runtime"
  );
  await getTelegramRuntime();
  const stop = () => {
    void stopTelegramRuntime().catch(() => {});
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
