import { hasLocale, type Locale } from "@/lib/i18n/config";
export type Envelope = {
  userId: number;
  chatId: number;
  username: string | null;
  locale: Locale;
  text: string;
  supported: boolean;
};
export function readEnvelope(value: unknown): Envelope | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const chat = raw.chat as { id?: number; type?: string } | undefined;
  const from = raw.from as
    | {
        id?: number;
        is_bot?: boolean;
        username?: string;
        language_code?: string;
      }
    | undefined;
  if (
    chat?.type !== "private" ||
    !Number.isSafeInteger(chat.id) ||
    !Number.isSafeInteger(from?.id) ||
    from?.is_bot ||
    !from?.id ||
    from.id < 1 ||
    chat.id !== from.id ||
    raw.business_connection_id ||
    raw.message_thread_id ||
    raw.edit_date
  )
    return null;
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  const unsupported = [
    "photo",
    "video",
    "audio",
    "voice",
    "document",
    "sticker",
    "animation",
    "video_note",
    "contact",
    "location",
    "venue",
    "poll",
    "dice",
    "caption",
    "rich_message",
  ];
  return {
    userId: from.id,
    chatId: chat.id!,
    username:
      typeof from.username === "string" ? from.username.slice(0, 64) : null,
    locale: hasLocale(from.language_code) ? from.language_code : "en",
    text,
    supported: !!text && !unsupported.some((key) => raw[key] !== undefined),
  };
}
