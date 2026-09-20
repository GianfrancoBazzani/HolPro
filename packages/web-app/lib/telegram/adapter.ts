import { TelegramAdapter, type TelegramUpdate } from "@chat-adapter/telegram";
import type { WebhookOptions, StreamChunk, AdapterPostableMessage } from "chat";
import { currentScope, exclusive, linkKeys } from "./lifecycle";
import { readEnvelope } from "./envelope";
import { findUserLink } from "./links";
import { loadUserWithRoles } from "@/lib/auth/repository";
import { isBlocked, roleOf } from "@/lib/auth/policy";
export function splitTelegramText(text: string) {
  const chunks: string[] = [];
  let chunk = "";
  for (const character of text) {
    if (chunk.length + character.length > 4096) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += character;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
export class GuardedTelegramAdapter extends TelegramAdapter {
  // Mastra owns history. Do not retain raw /start tokens or old-link messages
  // in the adapter's independent process cache.
  protected override cacheMessage() {}
  constructor(config?: ConstructorParameters<typeof TelegramAdapter>[0]) {
    super(config);
    // The vendor declaration fixes this flag to literal true, but the SDK
    // explicitly treats it as a boolean capability at runtime.
    Object.defineProperty(this, "persistThreadHistory", { value: false });
  }
  override async postMessage(
    threadId: string,
    message: AdapterPostableMessage,
    replyToMessageId?: string,
  ) {
    if (typeof message !== "string")
      return super.postMessage(threadId, message, replyToMessageId);
    let result;
    for (const text of splitTelegramText(message))
      result = await super.postMessage(threadId, text, replyToMessageId);
    if (!result) throw new Error("telegram_empty_reply");
    return result;
  }
  override async stream(
    threadId: string,
    source: AsyncIterable<string | StreamChunk>,
  ) {
    const chatId = Number(this.decodeThreadId(threadId).chatId);
    const draftId = Math.floor(Math.random() * 2_000_000_000) + 1;
    let text = "",
      lastDraft = 0,
      drafts = true;
    for await (const chunk of source) {
      if (typeof chunk === "string") text += chunk;
      else if (chunk.type === "markdown_text") text += chunk.text;
      else continue;
      if (drafts && text.trim() && Date.now() - lastDraft >= 1000) {
        lastDraft = Date.now();
        try {
          await this.telegramFetch("sendMessageDraft", {
            chat_id: chatId,
            draft_id: draftId,
            text: splitTelegramText(text).at(-1),
          });
        } catch {
          drafts = false;
        } // Final delivery still checks generation and reports failures.
      }
    }
    if (!text.trim()) return null;
    return this.postMessage(threadId, text);
  }
  protected override processUpdate(
    update: TelegramUpdate,
    options?: WebhookOptions,
  ) {
    if (!update.message || !readEnvelope(update.message)) return;
    return super.processUpdate(
      { update_id: update.update_id, message: update.message },
      options,
    );
  }
  protected override async telegramFetch<T>(
    method: string,
    payload?: Record<string, unknown> | FormData,
    request?: { signal?: AbortSignal },
  ): Promise<T> {
    if (!/^(send|edit)/.test(method) || method === "sendChatAction")
      return super.telegramFetch<T>(method, payload, request);
    const scope = currentScope();
    if (!scope) throw new Error("telegram_delivery_without_scope");
    if ("system" in scope)
      return super.telegramFetch<T>(method, payload, request);
    return exclusive(linkKeys(scope.userId, scope.chatId), async () => {
      const link = await findUserLink(scope.userId);
      const user = await loadUserWithRoles(scope.userId);
      const chatId =
        payload instanceof FormData
          ? Number(payload.get("chat_id"))
          : Number(payload?.chat_id);
      if (
        !link ||
        link.id !== scope.id ||
        link.revokedAt ||
        link.role !== scope.role ||
        link.telegramChatId !== scope.chatId ||
        chatId !== scope.chatId ||
        !user ||
        isBlocked(user) ||
        !roleOf(user, scope.role)
      )
        throw new Error("telegram_delivery_revoked");
      return super.telegramFetch<T>(method, payload, request);
    });
  }
}
