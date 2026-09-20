import type { MastraMemory } from "@mastra/core/memory";
import { isThreadOf, type Actor } from "@/mastra/context";
export type Conversation = {
  id: string;
  title: string | null;
  updatedAt: string;
};
export const conversationLimit = 20;
export async function listConversations(
  memory: Pick<MastraMemory, "listThreads">,
  actor: Actor,
): Promise<Conversation[]> {
  // The prefix filter runs after the query: Telegram threads and the other
  // portal share the resource, so a paged query could lose rows.
  const page = await memory.listThreads({
    filter: { resourceId: actor.userId },
    orderBy: { field: "updatedAt", direction: "DESC" },
    perPage: false,
  });
  return page.threads
    .filter((thread) => isThreadOf(actor, thread.id))
    .slice(0, conversationLimit)
    .map((thread) => ({
      id: thread.id,
      title: thread.title || null,
      updatedAt: new Date(thread.updatedAt).toISOString(),
    }));
}
