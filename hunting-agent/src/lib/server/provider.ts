import "dotenv/config";
import type { LLMProvider } from "../../framework/providers/types.js";
import { createGeminiProvider } from "../../framework/providers/gemini.js";
import { createOpenAIProvider } from "../../framework/providers/openai.js";
import { createAnthropicProvider } from "../../framework/providers/anthropic.js";
import { createClaudeCodeProvider } from "../../framework/providers/claude-code.js";
import { createCodexCliProvider } from "../../framework/providers/codex-cli.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not set in .env`);
  return value;
}

export function selectProvider(): LLMProvider {
  const providerName = requireEnv("LLM_PROVIDER");

  switch (providerName) {
    case "gemini":
      return createGeminiProvider(
        requireEnv("GEMINI_API_KEY"),
        requireEnv("GEMINI_MODEL"),
      );

    case "openai":
      return createOpenAIProvider(
        requireEnv("OPENAI_API_KEY"),
        requireEnv("OPENAI_MODEL"),
      );

    case "anthropic":
      return createAnthropicProvider(
        requireEnv("ANTHROPIC_API_KEY"),
        requireEnv("ANTHROPIC_MODEL"),
      );

    case "claude-code":
      return createClaudeCodeProvider(
        "claude",
        requireEnv("CLAUDE_CODE_MODEL"),
      );

    case "codex-cli":
      return createCodexCliProvider("codex", requireEnv("CODEX_MODEL"));

    default:
      throw new Error(`Unknown LLM_PROVIDER: ${providerName}`);
  }
}
