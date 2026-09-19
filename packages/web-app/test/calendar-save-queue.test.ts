import { expect, it, vi } from "vitest";
import { createSaveQueue } from "../lib/calendar/save-queue";
function deferred() {
  let resolve!: (value: { ok: boolean }) => void,
    reject!: (error: Error) => void;
  const promise = new Promise<{ ok: boolean }>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
it("serializes saves, coalesces waiting changes and reverts to the last confirmed state", async () => {
  const a = deferred(),
    c = deferred();
  const save = vi
    .fn()
    .mockReturnValueOnce(a.promise)
    .mockReturnValueOnce(c.promise);
  const shown = vi.fn(),
    confirmed = vi.fn(),
    failed = vi.fn();
  const queue = createSaveQueue<number>(0, save, { shown, confirmed, failed });
  const running = queue.update(1);
  void queue.update(2);
  void queue.update(3);
  expect(shown.mock.calls).toEqual([[1], [2], [3]]);
  expect(save.mock.calls).toEqual([[1]]);
  a.resolve({ ok: true });
  await Promise.resolve();
  await Promise.resolve();
  expect(save.mock.calls).toEqual([[1], [3]]);
  expect(confirmed).toHaveBeenLastCalledWith(1);
  c.resolve({ ok: false });
  await running;
  expect(shown).toHaveBeenLastCalledWith(1);
  expect(failed).toHaveBeenLastCalledWith(true);
});
it("drops queued changes after a rejection and allows retry", async () => {
  const a = deferred(),
    shown = vi.fn();
  const save = vi
    .fn()
    .mockReturnValueOnce(a.promise)
    .mockResolvedValue({ ok: true });
  const queue = createSaveQueue<number>(0, save, {
    shown,
    confirmed: vi.fn(),
    failed: vi.fn(),
  });
  const running = queue.update(1);
  void queue.update(2);
  a.reject(new Error("offline"));
  await running;
  expect(save).toHaveBeenCalledTimes(1);
  expect(shown).toHaveBeenLastCalledWith(0);
  await queue.update(3);
  expect(save.mock.calls).toEqual([[1], [3]]);
});
