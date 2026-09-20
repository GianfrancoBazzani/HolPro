import { pathToFileURL } from "node:url";
export function webhookSettings(args, env) {
  const dryRun = args.includes("--dry-run");
  const index = args.indexOf("--url");
  const url = index < 0 ? undefined : args[index + 1];
  if (
    !url ||
    new URL(url).protocol !== "https:" ||
    new URL(url).username ||
    new URL(url).password ||
    new URL(url).search ||
    new URL(url).hash
  )
    throw Error("Provide --url with a public HTTPS webhook URL.");
  const token = env.TELEGRAM_BOT_TOKEN;
  const secret = env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  if (!token || !secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret))
    throw Error(
      "Set TELEGRAM_BOT_TOKEN and a valid TELEGRAM_WEBHOOK_SECRET_TOKEN.",
    );
  return {
    dryRun,
    token,
    payload: { url, secret_token: secret, allowed_updates: ["message"] },
  };
}
export async function main(args = process.argv.slice(2), env = process.env) {
  try {
    const { dryRun, token, payload } = webhookSettings(args, env);
    if (dryRun) {
      console.log(
        JSON.stringify({
          url: payload.url,
          allowed_updates: payload.allowed_updates,
          secret: "[redacted]",
          dryRun: true,
        }),
      );
      return;
    }
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const result = await response.json();
    if (!response.ok || result.ok !== true)
      throw Error("Telegram rejected webhook registration.");
    console.log("Telegram webhook registered.");
  } catch {
    console.error(
      "Webhook registration failed. Check the HTTPS URL and Telegram environment variables.",
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
