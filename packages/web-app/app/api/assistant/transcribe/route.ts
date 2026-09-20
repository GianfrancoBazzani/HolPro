import { Readable } from "node:stream";
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
  if (Number(request.headers.get("content-length")) > limits.audioRequestBytes)
    return invalidInput();
  const form = await request.formData().catch(() => null),
    audio = form?.get("audio");
  if (!(audio instanceof File) || !audio.size || audio.size > limits.audioBytes)
    return invalidInput();
  const mime = audio.type.split(";")[0].trim();
  if (mime !== "audio/webm" && mime !== "audio/mp4" && mime !== "audio/mpeg")
    return invalidInput();
  const filetype = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mpeg",
  }[mime];
  try {
    const { voice } = await import("@/mastra/voice");
    const text = await voice.listen(
      Readable.from(Buffer.from(await audio.arrayBuffer())),
      { filetype, language: session.locale },
    );
    if (typeof text !== "string") return assistantError();
    return Response.json({ text });
  } catch {
    return assistantError();
  }
}
