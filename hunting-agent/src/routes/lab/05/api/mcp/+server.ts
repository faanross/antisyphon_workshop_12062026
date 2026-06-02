import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";
import { runGtiMcpLifecycle, type McpLifecycleEvent } from "../../../../../framework/mcp.js";

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as { indicator?: string };
  const indicator = body.indicator?.trim() || "185.225.73.217";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: McpLifecycleEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void runGtiMcpLifecycle({ indicator, env, emit })
        .catch((error: unknown) => {
          emit({
            step: "done",
            status: "error",
            message: error instanceof Error ? error.message : "Unknown MCP route failure.",
          });
        })
        .finally(() => {
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
