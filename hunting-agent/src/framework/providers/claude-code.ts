import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { LLMProvider, LLMResult } from "./types.js";

export function createClaudeCodeProvider(
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
        model: `claude-code-cli:${model}`,
      };
    },

    async *streamInvoke({ systemPrompt, userPrompt }): AsyncIterable<string> {
      const combined = `${systemPrompt}\n\n---\n\n${userPrompt}`;
      const args = [
        "--print",
        "--model",
        model,
        "--output-format",
        "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--tools",
        "",
        "--disable-slash-commands",
        "--no-session-persistence",
      ];

      if (process.env.CLAUDE_CODE_BARE === "1") {
        args.push("--bare");
      }

      const child = spawn(binary, [...args, combined], {
        stdio: ["ignore", "pipe", "pipe"],
      });
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
            ev.type === "stream_event" &&
            ev.event?.type === "content_block_delta" &&
            ev.event?.delta?.type === "text_delta"
          ) {
            yield ev.event.delta.text;
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
            reject(new Error(`Claude Code exited with code ${code}${detail}`));
          }
        });
        child.on("error", reject);
      });
    },
  };
}
