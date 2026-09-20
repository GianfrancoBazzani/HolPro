import { expect, it } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import { telegramStreamOptions } from "../mastra/telegram-stream";
it("restores the 20-minute budget after sendMessage overwrites untilIdle with true", () => {
  const requestContext = new RequestContext();
  requestContext.set("assistant", { surface: "telegram" });
  expect(
    telegramStreamOptions({ requestContext, untilIdle: true })?.untilIdle,
  ).toEqual({ maxIdleMs: 1200000 });
  // Inner idle-loop calls omit untilIdle; never reintroduce it recursively.
  expect(telegramStreamOptions({ requestContext })?.untilIdle).toBeUndefined();
  requestContext.set("assistant", { surface: "web" });
  expect(
    telegramStreamOptions({ requestContext, untilIdle: true })?.untilIdle,
  ).toBe(true);
});
