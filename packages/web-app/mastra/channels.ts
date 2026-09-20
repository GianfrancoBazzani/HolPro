import { TelegramAgentChannels } from "./telegram-agent-channels";
import { Message, ConsoleLogger } from "chat";
import { telegramConfig } from "@/lib/telegram/config";
import { GuardedTelegramAdapter } from "@/lib/telegram/adapter";
import { readEnvelope } from "@/lib/telegram/envelope";
import { handleTelegram, activeLink } from "@/lib/telegram/handlers";
import { findTelegramLink } from "@/lib/telegram/links";
import { currentScope } from "@/lib/telegram/lifecycle";
import en from "@/messages/en.json";
export function createTelegramChannels(): TelegramAgentChannels | undefined {
  const config = telegramConfig();
  if (!config) return;
  return new TelegramAgentChannels({
    adapters: {
      telegram: {
        adapter: new GuardedTelegramAdapter({
          ...config,
          logger: new ConsoleLogger("silent"),
          longPolling: { allowedUpdates: ["message"] },
        }),
        streaming: true,
        toolDisplay: "hidden",
        textFormat: "plain",
        typingStatus: false,
        formatError: () => {
          const scope = currentScope();
          return scope && !("system" in scope)
            ? (scope.errorMessage ?? en.telegram.error)
            : en.telegram.error;
        },
      },
    },
    chatOptions: { logger: "silent" },
    userName: config.userName,
    inlineMedia: [],
    tools: false,
    handlers: {
      onMention: false,
      onSubscribedMessage: false,
      onAction: false,
      onDirectMessage: async (thread, message, next, context) => {
        const envelope = readEnvelope(message.raw);
        if (!envelope) return;
        await handleTelegram(
          envelope,
          context.requestContext,
          context.mastra!.getAgentById("holpro-assistant"),
          (text) => thread.post(text),
          async (text) => {
            const normalized = new Message({
              ...message,
              text,
              attachments: [],
              formatted: {
                type: "root",
                children: [
                  {
                    type: "paragraph",
                    children: [{ type: "text", value: text }],
                  },
                ],
              },
            });
            await next(thread, normalized);
          },
        );
      },
      onSlashCommand: async (event, next, context) => {
        const envelope = readEnvelope(event.raw);
        if (!envelope) return;
        const agent = context.mastra!.getAgentById("holpro-assistant");
        await handleTelegram(
          envelope,
          context.requestContext,
          agent,
          (text) =>
            agent.getChannels()!.sdk!.thread(event.channel.id).post(text),
          async () => {
            await next();
          },
        );
      },
    },
    resolveResourceId: async ({ message }) => {
      const link = activeLink(
        await findTelegramLink(Number(message.author.userId)),
      );
      if (!link) throw new Error("telegram_not_linked");
      return link.userId;
    },
    resolveThreadId: ({ resourceId }) => `telegram:${resourceId}`,
  });
}
