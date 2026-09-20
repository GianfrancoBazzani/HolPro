import { expect, it } from "vitest";
import { pushInput } from "../lib/notifications/push-input";
const keys = { p256dh: "B".repeat(87), auth: "A".repeat(22) };
it.each([
  "http://fcm.googleapis.com/a",
  "https://localhost/a",
  "https://127.0.0.1/a",
  "https://fcm.googleapis.com.attacker.test/a",
  "https://fcm.googleapis.com:8443/a",
  "https://user:pass@fcm.googleapis.com/a",
])("rejects unsafe push endpoint %s", (endpoint) => {
  expect(pushInput.safeParse({ endpoint, keys }).success).toBe(false);
});
it.each([
  "https://fcm.googleapis.com/fcm/send/token",
  "https://updates.push.services.mozilla.com/wpush/v2/token",
  "https://web.push.apple.com/token",
])("accepts public push endpoint %s", (endpoint) => {
  expect(pushInput.safeParse({ endpoint, keys }).success).toBe(true);
});
