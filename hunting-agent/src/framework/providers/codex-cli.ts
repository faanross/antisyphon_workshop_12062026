import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { LLMProvider, LLMResult } from "./types.js";

const DEFAULT_DISPLAY_CHUNK_DELAY_MS = 5;

function chunkTextForDisplay(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function displayChunkDelayMs(): number {
  const raw = process.env.CODEX_CLI_DISPLAY_CHUNK_DELAY_MS;
  if (!raw) return DEFAULT_DISPLAY_CHUNK_DELAY_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_DISPLAY_CHUNK_DELAY_MS;
}

async function* streamFinalTextForDisplay(text: string): AsyncIterable<string> {
  const delayMs = displayChunkDelayMs();
  for (const chunk of chunkTextForDisplay(text)) {
    yield chunk;
    if (delayMs > 0) await sleep(delayMs);
  }
}

export function createCodexCliProvider(
  binary: string,
  model: string,
): LLMProvider {
  return {
    async invoke({ systemPrompt, userPrompt, onToken }): Promise<LLMResult> {
      let accumulated = "";
      for await (const token of this.streamInvoke({
        systemPrompt,
        userPrompt,
      })) {
        accumulated += token;
        onToken?.(token);
      }
      return {
        text: accumulated,
        model: `codex-cli:${model}`,
      };
    },

    async *streamInvoke({ systemPrompt, userPrompt }): AsyncIterable<string> {
      const prompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

      // codex exec --json exposes the final assistant message, but not token
      // deltas. The adapter still returns AsyncIterable chunks so the UI can
      // consume the same stream contract as the API-backed providers.
      const child = spawn(
        binary,
        [
          "exec",
          "--json",
          "--ignore-user-config",
          "--ignore-rules",
          "--ephemeral",
          "--skip-git-repo-check",
          "--sandbox",
          "read-only",
          "--color",
          "never",
          "--disable",
          "plugins",
          "--disable",
          "apps",
          "--disable",
          "shell_snapshot",
          "--model",
          model,
          prompt,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr = `${stderr}${chunk.toString()}`.slice(-4000);
      });

      const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line);
          if (
            ev.type === "item.completed" &&
            ev.item?.type === "agent_message" &&
            ev.item?.text
          ) {
            yield* streamFinalTextForDisplay(ev.item.text);
          }
        } catch {
          // skip malformed lines
        }
      }

      await new Promise<void>((resolve, reject) => {
        child.on("close", (code) => {
          if (code === 0) resolve();
          else {
            const detail = stderr.trim() ? `: ${stderr.trim()}` : "";
            reject(new Error(`Codex CLI exited with code ${code}${detail}`));
          }
        });
        child.on("error", reject);
      });
    },
  };
}
