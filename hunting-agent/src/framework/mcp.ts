import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

export type McpLifecycleStep = "connect" | "discover" | "call" | "done";
export type McpLifecycleStatus = "start" | "ok" | "error";

export interface McpLifecycleEvent {
  readonly step: McpLifecycleStep;
  readonly status: McpLifecycleStatus;
  readonly message: string;
  readonly durationMs?: number;
  readonly details?: unknown;
}

export interface GtiToolSummary {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: unknown;
  readonly relevant: boolean;
}

export interface GtiToolSelection {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly reason: string;
  readonly indicatorType: "ip" | "domain" | "url" | "search";
}

export interface GtiMcpConfig {
  readonly command: string;
  readonly args: readonly string[];
  readonly serverDirectory: string;
  readonly transport: "stdio";
  readonly apiKeyPresent: boolean;
}

type EnvLike = Record<string, string | undefined>;
type EmitLifecycleEvent = (event: McpLifecycleEvent) => void;

const RELEVANT_GTI_TOOLS = new Set([
  "get_ip_address_report",
  "get_domain_report",
  "get_url_report",
  "search_iocs",
]);

function envStringMap(extra: EnvLike): Record<string, string> {
  const merged = { ...process.env, ...extra };
  return Object.fromEntries(
    Object.entries(merged).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function defaultGtiMcpDir(): string {
  return path.resolve(process.cwd(), "../mcp-security/server/gti/gti_mcp");
}

export function getGtiMcpConfig(env: EnvLike): GtiMcpConfig {
  const command = env.GTI_MCP_COMMAND ?? "uv";
  const serverDirectory = env.GTI_MCP_DIR ?? defaultGtiMcpDir();
  const args = ["--directory", serverDirectory, "run", "server.py"];

  return {
    command,
    args,
    serverDirectory,
    transport: "stdio",
    apiKeyPresent: Boolean(env.VT_APIKEY),
  };
}

function isIpAddress(value: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim());
}

function hostnameFromInput(input: string): string {
  const trimmed = input.trim();

  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return parsed.hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split(/[/?#:]/)[0];
  }
}

export function selectGtiTool(indicator: string): GtiToolSelection {
  const trimmed = indicator.trim();

  if (trimmed.includes("://")) {
    return {
      toolName: "get_url_report",
      args: { url: trimmed },
      reason: "The input is a full URL, so GTI URL reporting is the most specific lookup.",
      indicatorType: "url",
    };
  }

  const hostname = hostnameFromInput(trimmed);

  if (isIpAddress(hostname)) {
    return {
      toolName: "get_ip_address_report",
      args: { ip_address: hostname },
      reason: "The input is an IPv4 address, so GTI IP reporting is the most direct lookup.",
      indicatorType: "ip",
    };
  }

  if (hostname.includes(".")) {
    return {
      toolName: "get_domain_report",
      args: { domain: hostname },
      reason: "The input looks like a domain, so GTI domain reporting is the most direct lookup.",
      indicatorType: "domain",
    };
  }

  return {
    toolName: "search_iocs",
    args: { query: trimmed, limit: 10 },
    reason: "The input is not a URL, IP, or domain, so the harness falls back to GTI IOC search.",
    indicatorType: "search",
  };
}

function summarizeTools(tools: Array<{ name: string; description?: string; inputSchema?: unknown }>): GtiToolSummary[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.inputSchema ?? {},
    relevant: RELEVANT_GTI_TOOLS.has(tool.name),
  }));
}

function parseMcpTextResult(result: unknown): { text: string; json: unknown | null } {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  const text = content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");

  if (!text) {
    return { text: "", json: null };
  }

  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

export async function runGtiMcpLifecycle(options: {
  readonly indicator: string;
  readonly env: EnvLike;
  readonly emit: EmitLifecycleEvent;
}): Promise<void> {
  const config = getGtiMcpConfig(options.env);
  let client: Client | null = null;

  const connectStart = Date.now();
  options.emit({
    step: "connect",
    status: "start",
    message: "Starting Google GTI MCP server over stdio.",
    details: config,
  });

  try {
    if (!config.apiKeyPresent) {
      throw new Error("VT_APIKEY is not configured.");
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: [...config.args],
      env: envStringMap(options.env),
    });

    client = new Client(
      { name: "antisiphon-lab04-gti", version: "1.0.0" },
      { capabilities: {} },
    );

    await client.connect(transport);

    options.emit({
      step: "connect",
      status: "ok",
      message: "Connected to GTI MCP server.",
      durationMs: Date.now() - connectStart,
      details: config,
    });

    const discoverStart = Date.now();
    options.emit({
      step: "discover",
      status: "start",
      message: "Calling listTools() against the MCP server.",
    });

    const listToolsResult = await client.listTools();
    const tools = summarizeTools(listToolsResult.tools);
    const selection = selectGtiTool(options.indicator);

    options.emit({
      step: "discover",
      status: "ok",
      message: `Discovered ${tools.length} GTI MCP tools.`,
      durationMs: Date.now() - discoverStart,
      details: {
        toolCount: tools.length,
        tools,
        selectedTool: selection,
      },
    });

    const callStart = Date.now();
    options.emit({
      step: "call",
      status: "start",
      message: `Calling ${selection.toolName}.`,
      details: selection,
    });

    const callResult = await client.callTool({
      name: selection.toolName,
      arguments: selection.args,
    });
    const parsed = parseMcpTextResult(callResult);

    options.emit({
      step: "call",
      status: "ok",
      message: "GTI MCP tool call completed.",
      durationMs: Date.now() - callStart,
      details: {
        selection,
        rawResult: callResult,
        textResult: parsed.text,
        parsedJson: parsed.json,
      },
    });

    options.emit({
      step: "done",
      status: "ok",
      message: "MCP lifecycle completed.",
    });
  } catch (error) {
    options.emit({
      step: "done",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown MCP lifecycle failure.",
    });
  } finally {
    await client?.close();
  }
}
