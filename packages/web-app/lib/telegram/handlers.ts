import type { RequestContext } from "@mastra/core/request-context";
import type { Agent } from "@mastra/core/agent";
import type { Envelope } from "./envelope";
import {
  findTelegramLink,
  pendingLink,
  consumeLink,
  type TelegramLink,
} from "./links";
import { exclusive, linkKeys, runScope, trackRun } from "./lifecycle";
import { loadUserWithRoles } from "@/lib/auth/repository";
import { isBlocked, roleOf } from "@/lib/auth/policy";
import { hasLocale, type Locale } from "@/lib/i18n/config";
import { getTranslator, type Dictionary } from "@/lib/i18n/dictionary";
import { loadOnboardingState } from "@/lib/assistant/onboarding";
import { limits } from "@/lib/assistant/limits";
import { applyAssistantContext, buildAssistantContext } from "@/mastra/context";
import {
  cleanTelegramMemory,
  verifyTelegramMemory,
} from "@/mastra/telegram-memory";
export async function systemReply(
  post: (text: string) => Promise<unknown>,
  locale: Locale,
  key: keyof Dictionary["telegram"],
  values?: Record<string, string>,
) {
  const t = await getTranslator(locale, "telegram");
  await runScope({ system: true, locale }, () => post(t(key, values))).catch(
    () => {},
  );
}
export async function handleTelegram(
  envelope: Envelope,
  request: RequestContext,
  agent: Agent,
  post: (text: string) => Promise<unknown>,
  invoke: (text: string) => Promise<void>,
) {
  const { text, userId, chatId } = envelope;
  const command = text.split(/\s/, 1)[0].split("@")[0];
  const reply = (
    key: keyof Dictionary["telegram"],
    locale = envelope.locale,
    values?: Record<string, string>,
  ) => systemReply(post, locale, key, values);
  if (!envelope.supported) {
    const link = await findTelegramLink(userId);
    const user =
      link && !link.revokedAt && link.telegramChatId === chatId
        ? await loadUserWithRoles(link.userId)
        : undefined;
    await reply(
      "textOnly",
      hasLocale(user?.locale) ? user.locale : envelope.locale,
    );
    return;
  }
  if (command === "/start") {
    const token = text.split(/\s+/)[1] ?? "";
    const pending = await pendingLink(token);
    if (!pending || text.split(/\s+/).length !== 2) {
      await reply("linkInvalid");
      return;
    }
    await exclusive(linkKeys(pending.userId, chatId), async () => {
      const user = await loadUserWithRoles(pending.userId);
      const locale = hasLocale(user?.locale) ? user.locale : envelope.locale;
      if (!user || isBlocked(user) || !roleOf(user, pending.role)) {
        await reply("unavailable", locale);
        return;
      }
      const result = await consumeLink(token, envelope, (link) =>
        cleanTelegramMemory(agent, link, chatId),
      );
      if (typeof result === "string") {
        await reply(result, locale);
        return;
      }
      await reply(`linked.${result.role}`, locale, { name: user.name });
    });
    return;
  }
  const initial = await findTelegramLink(userId);
  if (!initial || initial.telegramChatId !== chatId) {
    await reply("notLinked");
    return;
  }
  if (command === "/stop") {
    const { removeLink } = await import("./runtime");
    await removeLink(initial.userId, initial.id);
    return;
  }
  await exclusive(linkKeys(initial.userId, chatId), async () => {
    const link = await findTelegramLink(userId);
    if (
      !link ||
      link.id !== initial.id ||
      link.revokedAt ||
      link.telegramChatId !== chatId
    ) {
      await reply("notLinked");
      return;
    }
    const user = await loadUserWithRoles(link.userId);
    const locale = hasLocale(user?.locale) ? user.locale : envelope.locale;
    if (!user || isBlocked(user) || !roleOf(user, link.role)) {
      await reply("unavailable", locale);
      return;
    }
    if (text.length > limits.chatTextChars) {
      await reply("tooLong", locale);
      return;
    }
    const state =
      link.role === "coachee"
        ? await loadOnboardingState(user.id)
        : { onboarding: false, goalsSaved: false };
    applyAssistantContext(
      request,
      buildAssistantContext(user, link.role, locale, state, "telegram"),
    );
    await verifyTelegramMemory(agent, link);
    const t = await getTranslator(locale, "telegram");
    const controller = new AbortController();
    request.set("telegramAbortSignal", controller.signal);
    const generation = {
      errorMessage: t("error"),
      id: link.id,
      userId: link.userId,
      chatId,
      role: link.role,
      locale,
    };
    // Start on a later microtask after this lock is released; every send acquires it.
    const run = runScope(generation, async () => {
      await Promise.resolve();
      try {
        await invoke(text);
      } catch {
        await post(t("error")).catch(() => {});
      }
    });
    trackRun(link.id, run, controller);
    return { run };
  });
  // Polling must acknowledge dispatch without waiting for the idle stream.
  // trackRun retains cancellation/draining ownership until completion.
}
export function activeLink(link: TelegramLink | undefined) {
  return link && link.linkedAt && !link.revokedAt ? link : undefined;
}
