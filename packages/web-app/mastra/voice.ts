import { OpenAIVoice } from "@mastra/voice-openai";
import { MastraVoice } from "@mastra/core/voice";
// voice-openai 0.13 bundles an older private MastraVoice class. This adapter
// uses the current core base class while delegating provider operations.
class AssistantVoice extends MastraVoice {
  private provider?: OpenAIVoice;
  private getProvider() {
    return (this.provider ??= new OpenAIVoice({
      listeningModel: { name: "whisper-1" },
      speechModel: { name: "tts-1" },
      speaker: process.env.ASSISTANT_VOICE_SPEAKER ?? "alloy",
    }));
  }
  speak(input: string | NodeJS.ReadableStream, options?: { speaker?: string }) {
    return this.getProvider().speak(input, options);
  }
  listen(
    input: NodeJS.ReadableStream,
    options?: { filetype?: "webm" | "mp4" | "mpeg"; language?: string },
  ) {
    return this.getProvider().listen(input, options);
  }
}
export const voice = new AssistantVoice();
