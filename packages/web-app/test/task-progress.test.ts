import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTaskProgress } from "../components/assistant/use-task-progress";

const hooks = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  updates: [] as Array<{ index: number; update: (value: unknown) => unknown }>,
  values: [] as unknown[],
}));
vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
  useState: (initial: unknown) => {
    const index = hooks.values.push(initial) - 1;
    return [initial, (update: (value: unknown) => unknown) => hooks.updates.push({ index, update })];
  },
}));
let source: EventTarget;
let cleanup: void | (() => void);
beforeEach(() => {
  hooks.effects.length = hooks.updates.length = hooks.values.length = 0;
  source = Object.assign(new EventTarget(), { close() {} });
  vi.stubGlobal("EventSource", vi.fn(function () { return source; }));
  useTaskProgress(true, "coach");
  cleanup = hooks.effects[0]();
});
afterEach(() => { cleanup?.(); vi.unstubAllGlobals(); });
function emit(type: string, data: string) {
  source.dispatchEvent(new MessageEvent(type, { data }));
}
function flush() {
  for (const { index, update } of hooks.updates.splice(0))
    hooks.values[index] = update(hooks.values[index]);
}
it.each(["null", "{}", "[]", '"text"', '{"runId":4}', '{"runId":"r"}', "invalid"])(
  "ignores malformed completion events before scheduling state updates: %s", (data) => {
    emit("done", data);
    expect(hooks.updates).toHaveLength(0);
  },
);
it("retains valid progress and removes only the completed task", () => {
  emit("progress", '{"runId":"a","kind":"review","percent":25}');
  emit("progress", '{"runId":"b","kind":"plan","percent":0}');
  flush();
  emit("done", '{"runId":"a","kind":"review"}');
  flush();
  expect(hooks.values).toEqual([1, { b: { runId: "b", kind: "plan", percent: 0 } }]);
});
it.each(["null", "[]", "invalid", '{"runId":"a","kind":"plan","percent":"20"}', '{"runId":"a","kind":"plan","percent":1e400}'])(
  "ignores malformed progress: %s", (data) => {
    emit("progress", data);
    expect(hooks.updates).toHaveLength(0);
  },
);
