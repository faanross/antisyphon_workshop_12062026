import { GoogleGenAI } from "@google/genai";
import type { LLMProvider, LLMResult } from "./types.js";

export function createGeminiProvider(
  apiKey: string,
  model: string,
): LLMProvider {
  const client = new GoogleGenAI({ apiKey });

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

      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt },
      });

      return {
        text: response.text ?? "",
        model,
      };
    },

    async *streamInvoke({ systemPrompt, userPrompt }): AsyncIterable<string> {
      const response = await client.models.generateContentStream({
        model,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt },
      });

      for await (const chunk of response) {
        const text = chunk.text ?? "";
        if (text) {
          yield text;
        }
      }
    },
  };
}
