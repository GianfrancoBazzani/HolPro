import type { Agent } from "@mastra/core/agent";
import type { TelegramLink } from "@/lib/telegram/links";
export async function cleanTelegramMemory(
  agent: Agent,
  link: TelegramLink,
  chatId = link.telegramChatId,
) {
  const memory = await agent.getMemory();
  if (!memory) throw new Error("telegram_memory_unavailable");
  if (chatId != null) {
    const external = `telegram:${chatId}`;
    const channels = agent.getChannels();
    if (channels?.sdk) await channels.sdk.thread(external).unsubscribe();
    const page = await memory.listThreads({
      filter: {
        metadata: {
          channel_externalThreadId: external,
          channel_ownerId: agent.id,
        },
      },
      perPage: false,
    });
    for (const thread of page.threads) await memory.deleteThread(thread.id);
  }
  const id = `telegram:${link.userId}`;
  const thread = await memory.getThreadById({ threadId: id });
  if (thread) {
    if (thread.resourceId !== link.userId)
      throw new Error("telegram_thread_owner_conflict");
    await memory.deleteThread(id);
  }
}
export async function verifyTelegramMemory(agent: Agent, link: TelegramLink) {
  const memory = await agent.getMemory();
  if (!memory) throw new Error("telegram_memory_unavailable");
  const page = await memory.listThreads({
    filter: {
      metadata: {
        channel_externalThreadId: `telegram:${link.telegramChatId}`,
        channel_ownerId: agent.id,
      },
    },
    perPage: false,
  });
  if (
    page.threads.some(
      (t) => t.resourceId !== link.userId || t.id !== `telegram:${link.userId}`,
    )
  )
    throw new Error("telegram_thread_owner_conflict");
}
