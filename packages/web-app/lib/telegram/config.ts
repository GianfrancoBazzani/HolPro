type Environment = Record<string, string | undefined>;
export function telegramConfig(env: Environment = process.env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;
  const userName = env.TELEGRAM_BOT_USERNAME;
  const mode = env.TELEGRAM_MODE ?? "webhook";
  const secretToken = env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  if (!userName || !/^[A-Za-z0-9_]{5,32}$/.test(userName))
    throw new Error("telegram_config_username");
  if (mode !== "webhook" && mode !== "polling")
    throw new Error("telegram_config_mode");
  if (
    mode === "webhook" &&
    (!secretToken || !/^[A-Za-z0-9_-]{1,256}$/.test(secretToken))
  )
    throw new Error("telegram_config_secret");
  return {
    botToken,
    userName,
    mode: mode as "webhook" | "polling",
    secretToken,
    allowUnverifiedWebhooks: false as const,
  };
}
