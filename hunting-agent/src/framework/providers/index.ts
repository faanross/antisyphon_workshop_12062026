import "dotenv/config";
import type { LLMProvider } from "./types.js";
import { createAnthropicProvider } from "./anthropic.js";
import { createGeminiProvider } from "./gemini.js";
import { createOpenAIProvider } from "./openai.js";
import { createClaudeCodeProvider } from "./claude-code.js";
import { createCodexCliProvider } from "./codex-cli.js";
import { createMockProvider } from "./mock.js";

function env(name: string): string | undefined {
  return process.env[name];
}

function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} not set`);
  return value;
}

export function getProvider(): LLMProvider {
  const providerName = env("LLM_PROVIDER") ?? "mock";

  switch (providerName) {
    case "mock":
      return createMockProvider(env("MOCK_MODEL") ?? "mock-workshop-model");
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
      return createCodexCliProvider(
        "codex",
        requireEnv("CODEX_MODEL"),
      );
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${providerName}`);
  }
}
