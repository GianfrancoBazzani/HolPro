import { expect, it } from "vitest";
import { readEnvelope } from "../lib/telegram/envelope";
const raw = {
  message_id: 1,
  chat: { id: 7, type: "private" },
  from: { id: 7, language_code: "it" },
  text: " hello ",
};
it("normalizes only ordinary private text messages", () => {
  expect(readEnvelope(raw)).toMatchObject({
    text: "hello",
    userId: 7,
    chatId: 7,
    locale: "it",
    supported: true,
  });
  expect(readEnvelope({ ...raw, chat: { id: -8, type: "group" } })).toBeNull();
  expect(readEnvelope({ ...raw, business_connection_id: "x" })).toBeNull();
  expect(readEnvelope({ ...raw, message_thread_id: 3 })).toBeNull();
  expect(readEnvelope({ ...raw, edit_date: 4 })).toBeNull();
  expect(readEnvelope({ ...raw, from: { id: 7, is_bot: true } })).toBeNull();
});
it("rejects caption commands, stickers, nontext payloads and invalid ids", () => {
  expect(
    readEnvelope({
      ...raw,
      text: undefined,
      caption: "/start token",
      photo: [{}],
    })?.supported,
  ).toBe(false);
  expect(readEnvelope({ ...raw, sticker: {} })?.supported).toBe(false);
  expect(readEnvelope({ ...raw, text: "  " })?.supported).toBe(false);
  expect(
    readEnvelope({ ...raw, from: { id: Number.MAX_SAFE_INTEGER + 1 } }),
  ).toBeNull();
});
