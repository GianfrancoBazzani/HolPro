import { auth } from "@/lib/auth/server";
import { loadUserWithRoles } from "@/lib/auth/repository";
import { isBlocked, roleOf } from "@/lib/auth/policy";
import { resolveLocale } from "@/lib/i18n/negotiate";
import type { MastraMemory } from "@mastra/core/memory";
import { isThreadOf, threadIdFor, type Actor } from "@/mastra/context";
import { listConversations } from "@/lib/assistant/conversations";
export async function requireAssistantUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableRefresh: true, disableCookieCache: true },
  });
  if (!session) return null;
  const user = await loadUserWithRoles(session.user.id);
  if (!user || isBlocked(user)) return null;
  const portal = new URL(request.url).searchParams.get("portal");
  if (portal !== null && portal !== "coach" && portal !== "coachee") return null;
  const role = roleOf(user, portal ?? undefined);
  if (!role) return null;
  const actor: Actor = { role, userId: user.id };
  return { user, role, actor, locale: resolveLocale(request.headers) };
}
export const unauthorized = () =>
  Response.json({ error: "unauthorized" }, { status: 401 });
export const invalidInput = () =>
  Response.json({ error: "invalid_input" }, { status: 400 });
export const assistantError = () =>
  Response.json({ error: "assistant_error" }, { status: 500 });
// Every thread id from the client passes here. Null means "refuse with 401".
// `exists` is false only for the legacy thread before its first message.
export async function resolveThread(
  memory: Pick<MastraMemory, "listThreads" | "getThreadById">,
  actor: Actor,
  requested: string | null,
): Promise<{ id: string; exists: boolean } | null> {
  const legacy = threadIdFor(actor);
  if (requested === null) {
    const [newest] = await listConversations(memory, actor);
    return newest ? { id: newest.id, exists: true } : { id: legacy, exists: false };
  }
  if (!isThreadOf(actor, requested)) return null;
  const thread = await memory.getThreadById({ threadId: requested });
  if (thread)
    return thread.resourceId === actor.userId
      ? { id: requested, exists: true }
      : null;
  // A missing suffixed id was deleted, so the client falls back to the default.
  return requested === legacy ? { id: legacy, exists: false } : null;
}
