import { AsyncLocalStorage } from "node:async_hooks";
import type { Locale } from "@/lib/i18n/config";
import type { PortalKey } from "@/lib/auth/portals";
export type Generation = {
  id: string;
  userId: string;
  chatId: number;
  role: PortalKey;
  locale: Locale;
  errorMessage?: string;
};
export type DeliveryScope = Generation | { system: true; locale: Locale };
const storage = new AsyncLocalStorage<DeliveryScope>();
export const currentScope = () => storage.getStore();
export const runScope = <T>(scope: DeliveryScope, fn: () => T): T =>
  storage.run(scope, fn);
const tails = new Map<string, Promise<void>>();
export async function exclusive<T>(
  keys: string[],
  fn: () => Promise<T>,
): Promise<T> {
  const sorted = [...new Set(keys)].sort();
  async function acquire(index: number): Promise<T> {
    if (index === sorted.length) return fn();
    const key = sorted[index];
    const previous = tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((resolve) => {
      release = resolve;
    });
    tails.set(key, mine);
    await previous;
    try {
      return await acquire(index + 1);
    } finally {
      release();
      if (tails.get(key) === mine) tails.delete(key);
    }
  }
  return acquire(0);
}
const controllers = new Map<string, Set<AbortController>>();
export function abortRuns(id: string) {
  for (const controller of controllers.get(id) ?? []) controller.abort();
}
const runs = new Map<string, Set<Promise<unknown>>>();
export function trackRun(
  id: string,
  promise: Promise<unknown>,
  controller?: AbortController,
) {
  const activeControllers = controllers.get(id) ?? new Set<AbortController>();
  if (controller) {
    activeControllers.add(controller);
    controllers.set(id, activeControllers);
  }
  const set = runs.get(id) ?? new Set();
  runs.set(id, set);
  set.add(promise);
  void promise
    .catch(() => {})
    .finally(() => {
      set.delete(promise);
      if (controller) activeControllers.delete(controller);
      if (!activeControllers.size) controllers.delete(id);
      if (!set.size) runs.delete(id);
    });
}
export async function drainRuns(id: string) {
  while (runs.get(id)?.size) await Promise.allSettled([...(runs.get(id) ?? [])]);
}
export const linkKeys = (userId: string, chatId?: number | null) => [
  `user:${userId}`,
  ...(chatId == null ? [] : [`chat:${chatId}`]),
];

const signals = new Map<string, Set<string>>();
export function rememberSignal(generationId: string, signalId: string) {
  const ids = signals.get(generationId) ?? new Set<string>();
  ids.add(signalId);
  signals.set(generationId, ids);
}
export const signalIdsFor = (id: string) => [...(signals.get(id) ?? [])];
export const forgetSignals = (id: string) => {
  signals.delete(id);
};
