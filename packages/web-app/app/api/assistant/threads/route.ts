import {
  requireAssistantUser,
  unauthorized,
  invalidInput,
  assistantError,
  resolveThread,
} from "@/lib/assistant/session";
import { listConversations } from "@/lib/assistant/conversations";
import { newThreadId } from "@/mastra/context";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };
export async function GET(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  try {
    const { getAssistantMemory } = await import("@/mastra");
    const list = await listConversations(
      await getAssistantMemory(),
      session.actor,
    );
    return Response.json(list, { headers: noStore });
  } catch {
    return assistantError();
  }
}
export async function POST(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  try {
    const { getAssistantMemory } = await import("@/mastra");
    const id = newThreadId(session.actor),
      now = new Date();
    // No title: Mastra generates one after the first turn.
    await (await getAssistantMemory()).saveThread({
      thread: {
        id,
        resourceId: session.user.id,
        createdAt: now,
        updatedAt: now,
        metadata: { portal: session.role },
      },
    });
    return Response.json({ id }, { status: 201, headers: noStore });
  } catch {
    return assistantError();
  }
}
export async function DELETE(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  const requested = new URL(request.url).searchParams.get("thread");
  if (!requested) return invalidInput();
  try {
    const { getAssistantMemory } = await import("@/mastra");
    const memory = await getAssistantMemory();
    const thread = await resolveThread(memory, session.actor, requested);
    if (!thread) return unauthorized();
    if (thread.exists) await memory.deleteThread(thread.id);
    return new Response(null, { status: 204, headers: noStore });
  } catch {
    return assistantError();
  }
}
