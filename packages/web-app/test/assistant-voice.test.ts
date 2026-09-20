import { describe, it, expect } from "vitest";
import { Agent } from "@mastra/core/agent";
import { voice } from "../mastra/voice";
describe("assistant voice access", () => {
  const agent = new Agent({
    id: "voice-probe",
    name: "Voice probe",
    model: "openai/gpt-5.4-mini",
    instructions: () => "dynamic",
    voice,
  });
  it("rejects the agent voice getter when instructions are dynamic", () => {
    expect(() => agent.voice).toThrow();
  });
  it("exposes speak and listen on the adapter", () => {
    expect(typeof voice.speak).toBe("function");
    expect(typeof voice.listen).toBe("function");
  });
});
