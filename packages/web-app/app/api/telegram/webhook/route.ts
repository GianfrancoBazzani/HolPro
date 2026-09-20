import { telegramConfig } from "@/lib/telegram/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const config = telegramConfig();
    if (!config || config.mode === "polling")
      return new Response(null, { status: 404 });
    const { getTelegramRuntime } = await import("@/lib/telegram/runtime");
    const { channels } = await getTelegramRuntime();
    return await channels.handleWebhookEvent("telegram", request);
  } catch {
    return new Response(null, { status: 503 });
  }
}
