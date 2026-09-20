import { createHash } from "node:crypto";
import { createUIMessageStreamResponse } from "ai";
import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import { z } from "zod";
import {
  requireAssistantUser,
  unauthorized,
  invalidInput,
  assistantError,
} from "@/lib/assistant/session";
import { limits } from "@/lib/assistant/limits";
import { loadOnboardingState } from "@/lib/assistant/onboarding";
import {
  buildAssistantContext,
  toRequestContext,
  threadIdFor,
} from "@/mastra/context";
import { withSseHeartbeat } from "@/lib/assistant/sse";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Only user text crosses this boundary. Tool results, roles and identity are server-owned.
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        role: z.literal("user"),
        parts: z
          .array(
            z.object({
              type: z.literal("text"),
              text: z.string().trim().min(1).max(limits.chatTextChars),
            }),
          )
          .min(1)
          .max(1),
      }),
    )
    .length(1),
});
export async function POST(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput();
  try {
    const { user, role, locale } = session;
    const state =
      role === "coach"
        ? { onboarding: false, goalsSaved: false }
        : await loadOnboardingState(user.id);
    const context = buildAssistantContext(user, role, locale, state);
    const threadId = threadIdFor(context);
    const { mastra } = await import("@/mastra");
    const stream = await handleChatStream({
      mastra,
      agentId: "holpro-assistant",
      version: "v7",
      params: {
        // MySQL message IDs are globally unique; never trust a client ID as a storage key.
        messages: parsed.data.messages.map((message) => ({
          ...message,
          id: createHash("sha256")
            .update(JSON.stringify([threadId, message.id]))
            .digest("hex"),
        })),
        requestContext: toRequestContext(context),
        memory: { thread: threadId, resource: user.id },
      },
      defaultOptions: {
        untilIdle: { maxIdleMs: 20 * 60_000 },
        abortSignal: request.signal,
        maxSteps: 8,
      },
      onError: () => "assistant_error",
    });
    return withSseHeartbeat(createUIMessageStreamResponse({ stream }));
  } catch {
    return assistantError();
  }
}
export async function GET(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  try {
    const { getAssistant } = await import("@/mastra");
    const threadId = threadIdFor({
        role: session.role,
        userId: session.user.id,
      }),
      memory = await getAssistant().getMemory();
    const thread = await memory!.getThreadById({ threadId });
    if (thread && thread.resourceId !== session.user.id) return unauthorized();
    if (!thread)
      return Response.json([], { headers: { "cache-control": "no-store" } });
    const history = await memory!.recall({
      threadId,
      resourceId: session.user.id,
      perPage: false,
    });
    return Response.json(toAISdkMessages(history.messages, { version: "v7" }), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return assistantError();
  }
}
