import { Readable } from "node:stream";
import { z } from "zod";
import {
  requireAssistantUser,
  unauthorized,
  invalidInput,
  assistantError,
} from "@/lib/assistant/session";
import { limits } from "@/lib/assistant/limits";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  const parsed = z
    .object({ text: z.string().trim().min(1).max(limits.speechTextChars) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput();
  try {
    const { voice } = await import("@/mastra/voice");
    const audio = await voice.speak(parsed.data.text);
    if (!audio) return assistantError();
    const readable = new Readable().wrap(audio);
    return new Response(
      Readable.toWeb(readable) as ReadableStream<Uint8Array>,
      {
        headers: { "content-type": "audio/mpeg", "cache-control": "no-store" },
      },
    );
  } catch {
    return assistantError();
  }
}
