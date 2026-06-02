// ---------------------------------------------------------------------------
// Result type — normalized output from any provider
// ---------------------------------------------------------------------------

export interface LLMResult {
  readonly text: string;
  readonly model: string;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

// ---------------------------------------------------------------------------
// Provider interface — what stage logic depends on
// ---------------------------------------------------------------------------

export interface LLMProvider {
  /** One-shot invocation. Returns the complete response. */
  invoke(params: {
    systemPrompt: string;
    userPrompt: string;
    onToken?: (token: string) => void;
  }): Promise<LLMResult>;

  /** Streaming invocation. Yields tokens as they arrive. */
  streamInvoke(params: {
    systemPrompt: string;
    userPrompt: string;
  }): AsyncIterable<string>;
}
