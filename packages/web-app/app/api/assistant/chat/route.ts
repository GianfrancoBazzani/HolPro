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
  resolveThread,
} from "@/lib/assistant/session";
import { limits } from "@/lib/assistant/limits";
import { loadClientPlan } from "@/lib/pro/repository";
import { findPlanEngagementId } from "@/lib/plans/repository";
import { loadOnboardingState } from "@/lib/assistant/onboarding";
import { buildAssistantContext, toRequestContext } from "@/mastra/context";
import { withSseHeartbeat } from "@/lib/assistant/sse";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Only user text and selection IDs cross this boundary. Selection access is
// verified below; tool results, roles and identity remain server-owned.
const bodySchema = z.object({
  engagementId: z.string().min(1).max(200).optional(),
  planId: z.string().min(1).max(200).optional(),
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
    const { user, role, locale, actor } = session;
    let client;
    if (parsed.data.engagementId) {
      if (role !== "coach") return unauthorized();
      const data = await loadClientPlan(user.id, parsed.data.engagementId, { includeEnded: true });
      if (!data) return unauthorized();
      if (
        parsed.data.planId &&
        await findPlanEngagementId(actor, parsed.data.planId) !== data.client.engagementId
      ) return unauthorized();
      client = {
        engagementId: data.client.engagementId,
        name: data.client.name,
        status: data.status,
        planId: parsed.data.planId,
      };
    } else if (parsed.data.planId) return invalidInput();
    const { mastra, getAssistantMemory } = await import("@/mastra");
    const [state, thread] = await Promise.all([
      role === "coach"
        ? { onboarding: false, goalsSaved: false }
        : loadOnboardingState(user.id),
      resolveThread(
        await getAssistantMemory(),
        actor,
        new URL(request.url).searchParams.get("thread"),
      ),
    ]);
    if (!thread) return unauthorized();
    const threadId = thread.id;
    const context = buildAssistantContext(user, role, locale, state);
    if (client) context.client = client;
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
    const { getAssistantMemory } = await import("@/mastra");
    const memory = await getAssistantMemory();
    const thread = await resolveThread(
      memory,
      session.actor,
      new URL(request.url).searchParams.get("thread"),
    );
    if (!thread) return unauthorized();
    // The panel asks for the default conversation without an id; name it.
    const headers = {
      "cache-control": "no-store",
      "x-assistant-thread": thread.id,
    };
    if (!thread.exists) return Response.json([], { headers });
    const history = await memory.recall({
      threadId: thread.id,
      resourceId: session.user.id,
      perPage: false,
    });
    return Response.json(toAISdkMessages(history.messages, { version: "v7" }), {
      headers,
    });
  } catch {
    return assistantError();
  }
}
