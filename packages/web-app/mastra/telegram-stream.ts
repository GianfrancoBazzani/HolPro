import type { Agent } from "@mastra/core/agent";
import { currentScope, trackRun } from "@/lib/telegram/lifecycle";
import type { MastraModelOutput } from "@mastra/core/stream";
import type { AssistantContext } from "./context";
const installed = new WeakSet<Agent>();
type StreamOptions = NonNullable<
  Parameters<Agent["sendMessage"]>[1]["ifIdle"]
>["streamOptions"];
export function telegramStreamOptions(options: StreamOptions) {
  const context = options?.requestContext?.get("assistant") as
    | AssistantContext
    | undefined;
  return context?.surface === "telegram" && options?.untilIdle === true
    ? { ...options, untilIdle: { maxIdleMs: 20 * 60_000 } }
    : options;
}
export function installTelegramStreamOptions(agent: Agent) {
  if (installed.has(agent)) return;
  installed.add(agent);
  const original = agent.stream.bind(agent);
  // Preserve the overloads: only the transport's boolean idle option changes.
  agent.stream = ((
    messages: Parameters<Agent["stream"]>[0],
    options: StreamOptions,
  ) => {
    const scope = currentScope();
    if (scope && !("system" in scope) && options?.abortSignal?.aborted)
      return Promise.reject(new Error("telegram_run_revoked"));
    const output = Reflect.apply(original, agent, [
      messages,
      telegramStreamOptions(options),
    ]) as Promise<MastraModelOutput<unknown>>;
    // untilIdle closes its outer stream immediately on abort. Track inner
    // streams too so their final memory writes finish before thread deletion.
    if (scope && !("system" in scope))
      trackRun(
        scope.id,
        output.then((stream) => stream.consumeStream()),
      );
    return output;
  }) as Agent["stream"];
}
