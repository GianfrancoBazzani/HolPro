import { telegramConfig } from "./config";
import {
  exclusive,
  linkKeys,
  drainRuns,
  abortRuns,
  signalIdsFor,
  forgetSignals,
} from "./lifecycle";
import { findUserLink, revokeLink, deleteRevokedLink } from "./links";
import { cleanTelegramMemory } from "@/mastra/telegram-memory";
import { systemReply } from "./handlers";
import { loadUserWithRoles } from "@/lib/auth/repository";
import { hasLocale } from "@/lib/i18n/config";
let ready: Promise<Awaited<ReturnType<typeof initialize>>> | undefined;
async function initialize() {
  if (!telegramConfig()) throw new Error("telegram_disabled");
  const { mastra, getAssistant } = await import("@/mastra");
  const agent = getAssistant();
  const channels = agent.getChannels();
  if (!channels) throw new Error("telegram_disabled");
  await channels.initialize(mastra);
  await channels.sdk!.initialize();
  return { agent, channels, mastra };
}
export function getTelegramRuntime() {
  ready ??= initialize().catch((error) => {
    ready = undefined;
    throw error;
  });
  return ready;
}
export async function removeLink(userId: string, expectedId?: string) {
  const initial = await findUserLink(userId);
  if (!initial || (expectedId && initial.id !== expectedId)) return;
  const keys = linkKeys(userId, initial.telegramChatId);
  const link = await exclusive(keys, async () => {
    if ((await findUserLink(userId))?.id !== initial.id) return undefined;
    return revokeLink(userId);
  });
  if (!link) return;
  const { agent, channels, mastra } = await getTelegramRuntime();
  abortRuns(link.id);
  agent.abortThreadStream({
    threadId: `telegram:${userId}`,
    resourceId: userId,
  });
  agent.cancelQueuedMessages({
    threadId: `telegram:${userId}`,
    resourceId: userId,
    signalIds: signalIdsFor(link.id),
  });
  // Never drain under the delivery lock: cancelled output must be able to see revocation.
  await drainRuns(link.id);
  agent.cancelQueuedMessages({
    threadId: `telegram:${userId}`,
    resourceId: userId,
    signalIds: signalIdsFor(link.id),
  });
  // Draining first prevents a cancelling run from enqueuing one last task.
  const manager = mastra.backgroundTaskManager;
  if (manager) {
    while (true) {
      const batch = await manager.listTasks({
        agentId: agent.id,
        resourceId: userId,
        threadId: `telegram:${userId}`,
        status: ["pending", "running", "suspended"],
        perPage: 100,
      });
      if (!batch.tasks.length) break;
      await Promise.all(batch.tasks.map((task) => manager.cancel(task.id)));
    }
  }
  // Task cancellation can publish a final lifecycle event and start a continuation.
  abortRuns(link.id);
  agent.abortThreadStream({
    threadId: `telegram:${userId}`,
    resourceId: userId,
  });
  await drainRuns(link.id);
  forgetSignals(link.id);
  await exclusive(keys, async () => {
    const current = await findUserLink(userId);
    if (current?.id !== link.id || !current.revokedAt) return;
    await cleanTelegramMemory(agent, link);
    if (link.telegramChatId != null) {
      const user = await loadUserWithRoles(userId);
      await systemReply(
        (text) =>
          channels.sdk!.thread(`telegram:${link.telegramChatId}`).post(text),
        hasLocale(user?.locale) ? user.locale : "en",
        "unlinked",
      );
    }
    await deleteRevokedLink(link.id);
  });
}
export async function stopTelegramRuntime() {
  if (ready) await (await ready).channels.sdk!.shutdown();
  ready = undefined;
}
