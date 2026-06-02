import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { processChatTurn, processChatTurnStreaming } from "../../../../../framework/demo.js";

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as { message?: string; sessionId?: string; stream?: boolean };
  const wantsStream = body.stream || request.headers.get("accept")?.includes("application/x-ndjson");

  if (wantsStream) {
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          const send = (event: unknown) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          };

          try {
            await processChatTurnStreaming(
              body.message ?? "",
              body.sessionId ?? "lab03-session",
              send,
            );
          } catch (error) {
            send({
              type: "error",
              message: error instanceof Error ? error.message : "Unknown streaming error",
            });
          } finally {
            controller.close();
          }
        },
      }),
      {
        headers: {
          "content-type": "application/x-ndjson; charset=utf-8",
          "cache-control": "no-cache",
        },
      },
    );
  }

  return json(await processChatTurn(
    body.message ?? "",
    body.sessionId ?? "lab03-session",
  ));
};
