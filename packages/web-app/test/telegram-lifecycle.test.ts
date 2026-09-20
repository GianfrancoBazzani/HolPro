import { expect, it } from "vitest";
import {
  exclusive,
  runScope,
  currentScope,
  trackRun,
  drainRuns,
} from "../lib/telegram/lifecycle";
it("serializes overlapping operations and releases after errors", async () => {
  const events: number[] = [];
  await Promise.all([
    exclusive(["chat:1"], async () => {
      await Promise.resolve();
      events.push(1);
    }),
    exclusive(["chat:1"], async () => {
      events.push(2);
    }),
  ]);
  expect(events).toEqual([1, 2]);
  await expect(
    exclusive(["chat:1"], async () => {
      throw Error("test");
    }),
  ).rejects.toThrow("test");
  await exclusive(["chat:1"], async () => {
    events.push(3);
  });
  expect(events).toEqual([1, 2, 3]);
});
it("captures each generation independently and drains tracked work", async () => {
  const a = {
    id: "a",
    userId: "u",
    chatId: 1,
    role: "coach" as const,
    locale: "en" as const,
  };
  await runScope(a, async () => {
    await Promise.resolve();
    expect(currentScope()).toEqual(a);
  });
  expect(currentScope()).toBeUndefined();
  let finish!: () => void;
  const job = new Promise<void>((resolve) => {
    finish = resolve;
  });
  trackRun("a", job);
  let drained = false;
  const drain = drainRuns("a").then(() => {
    drained = true;
  });
  await Promise.resolve();
  expect(drained).toBe(false);
  finish();
  await drain;
  expect(drained).toBe(true);
});
