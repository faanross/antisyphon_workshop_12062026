import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMResult } from "./types.js";

export function createAnthropicProvider(
  apiKey: string,
  model: string,
): LLMProvider {
  const client = new Anthropic({ apiKey });

  return {
    async invoke({ systemPrompt, userPrompt, onToken }): Promise<LLMResult> {
      if (onToken) {
        let accumulated = "";
        for await (const token of this.streamInvoke({ systemPrompt, userPrompt })) {
          accumulated += token;
          onToken(token);
        }
        return { text: accumulated, model };
      }

      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const first = response.content[0];

      return {
        text: first?.type === "text" ? first.text : "",
        model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },

    async *streamInvoke({ systemPrompt, userPrompt }): AsyncIterable<string> {
      const stream = client.messages.stream({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    },
  };
}
