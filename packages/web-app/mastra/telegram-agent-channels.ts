import { AgentChannels } from "@mastra/core/channels";
import { installTelegramStreamOptions } from "./telegram-stream";
import { currentScope, rememberSignal } from "@/lib/telegram/lifecycle";
import type { Agent } from "@mastra/core/agent";
/** 1.67.0 re-merges defaultOptions on idle-loop recursion. Keep untilIdle per-call. */
export class TelegramAgentChannels extends AgentChannels {
  private owner!: Agent;
  override __setAgent(agent: Agent) {
    super.__setAgent(agent);
    this.owner = agent;
    installTelegramStreamOptions(agent);
  }
  protected override async dispatchInboundMessage(
    args: Parameters<AgentChannels["dispatchInboundMessage"]>[0],
  ) {
    const abortSignal = args.requestContext.get("telegramAbortSignal") as
      | AbortSignal
      | undefined;
    if (abortSignal?.aborted) return;
    const result = this.owner.sendMessage(
      {
        contents: args.signalContents,
        attributes: args.attributes,
        metadata: args.signalMetadata,
        providerOptions: args.providerOptions,
      },
      {
        resourceId: args.memory.resource,
        threadId: args.memory.thread,
        ifIdle: {
          behavior: "wake",
          streamOptions: {
            abortSignal,
            requestContext: args.requestContext,
            memory: args.memory,
            autoResumeSuspendedTools: args.autoResumeSuspendedTools,
            untilIdle: { maxIdleMs: 20 * 60_000 },
            maxSteps: 8,
          },
        },
      },
    );
    const generation = currentScope();
    if (generation && !("system" in generation))
      rememberSignal(generation.id, result.signal.id);
    const accepted = await result.accepted;
    if (accepted.action === "wake") await accepted.output.consumeStream();
  }
}
