import type { LLMProvider, LLMResult } from "./types.js";

function toolSelectionAnswer(prompt: string): string {
  const lower = prompt.toLowerCase();
  const observationCount = (prompt.match(/Observation \d+:/g) ?? []).length;

  if (observationCount === 0) {
    if (lower.includes("crowdfalcon")) {
      return JSON.stringify({
        thought: "The analyst is asking about CrowdFalcon, so I need the specific candidate tied to that destination before judging it.",
        action: "call_tool",
        tool: "query_candidates",
        args: { destIp: "104.18.32.7", limit: 5 },
      });
    }
    return JSON.stringify({
      thought: "Start by retrieving the beacon candidates above the requested threshold so triage is grounded in candidate records.",
      action: "call_tool",
      tool: "query_candidates",
      args: { type: "beacon", minBeaconScore: lower.includes("0.7") ? 0.7 : 0.85, limit: 5 },
    });
  }

  if (observationCount === 1 && lower.includes("bea-001")) {
    return JSON.stringify({
      thought: "BEA-001 appears to be the likely compromise, so I need its detailed attribution and enrichment before assigning priority.",
      action: "call_tool",
      tool: "get_candidate_detail",
      args: { candidateId: "BEA-001" },
    });
  }

  if (observationCount === 1 && lower.includes("104.18.32.7")) {
    return JSON.stringify({
      thought: "The high CrowdFalcon score needs score interpretation because regularity alone is not maliciousness.",
      action: "call_tool",
      tool: "explain_score",
      args: { candidateId: "BEA-002" },
    });
  }

  if (observationCount === 2 && lower.includes("185.225.73.217")) {
    return JSON.stringify({
      thought: "The destination is a key discriminator, so I should check threat intelligence for the suspected C2 IP.",
      action: "call_tool",
      tool: "lookup_threat_intel",
      args: { destIp: "185.225.73.217" },
    });
  }

  return JSON.stringify({
    thought: "The returned tool observations are enough to answer the analyst without more calls.",
    action: "finish",
    finalAnswer: "Use the retrieved candidate evidence, enrichment, and score explanation to answer.",
  });
}

function finalAnswer(prompt: string): string {
  const currentMessage = prompt.match(/Current user message:\n([\s\S]*?)\n\n/)?.[1]?.toLowerCase() ?? "";
  if (currentMessage.includes("crowdfalcon") || currentMessage.includes("104.18.32.7")) {
    return [
      "CrowdFalcon is a likely false positive even though it has the highest beacon score.",
      "",
      "The TAO trace matters here: the agent selected `query_candidates` to isolate the CrowdFalcon destination, then selected `explain_score` to inspect why the score is high. The observation shows regularity and consistency, which is expected for an EDR heartbeat. The LOTS match, known security-service context, and expected process explain the high score without requiring compromise.",
      "",
      "The key distinction is that score measures beacon shape. It does not prove malicious intent.",
    ].join("\n");
  }

  return [
    "Triage result:",
    "",
    "- BEA-001 is the likely true compromise. It combines high beacon regularity with rare destination 185.225.73.217, a threat-intel match, and suspicious process attribution: Code.exe -> powershell.exe -> svchost-health.exe.",
    "- BEA-002 is a likely false positive. CrowdFalcon EDR heartbeat traffic is intentionally regular, has a LOTS match, and is expected service activity.",
    "- BEA-003 and BEA-005 are likely benign service traffic because their destinations and LOTS context explain the beacon shape.",
    "- BEA-004 remains inconclusive. It is rare and lacks LOTS context, but the local fixture does not provide the same corroboration as BEA-001.",
    "",
    "The important point is visible in the TAO trace: the model had multiple tools available and selected candidate search first, then deeper detail/intel only when those observations were useful.",
  ].join("\n");
}

function deterministicAnswer(prompt: string): string {
  if (prompt.includes("TOOL_SELECTION_REQUEST")) return toolSelectionAnswer(prompt);
  if (prompt.includes("FINAL_TRIAGE_RESPONSE")) return finalAnswer(prompt);
  if (prompt.includes("MEMORY_COMPACTION_REQUEST")) {
    return [
      "The analyst is investigating beacon candidates in Lab 03.",
      "Important prior context: BEA-001 is the likely true compromise because it combines suspicious process attribution, rare destination 185.225.73.217, no LOTS explanation, and threat-intel context.",
      "BEA-002/CrowdFalcon can score higher while still being a likely false positive because regular EDR heartbeat behavior produces strong beacon regularity.",
      "Preserve follow-up continuity around candidate IDs, destination IPs, score interpretation, LOTS status, and tool observations used to support triage decisions.",
    ].join("\n");
  }

  const lower = prompt.toLowerCase();
  if (lower.includes("rag") || lower.includes("prior")) {
    return "Prior investigations should be used as precedent only when process lineage, destination ownership, and host role match the current evidence.";
  }
  return "Mock provider response: inspect beacon score, LOTS status, destination rarity, threat intel, and process attribution before assigning a verdict.";
}

export function createMockProvider(model = "mock-workshop-model"): LLMProvider {
  return {
    async invoke({ userPrompt, onToken }): Promise<LLMResult> {
      const text = deterministicAnswer(userPrompt);
      if (onToken) {
        for (const token of text.split(/(\s+)/)) onToken(token);
      }
      return { text, model };
    },

    async *streamInvoke({ userPrompt }): AsyncIterable<string> {
      for (const token of deterministicAnswer(userPrompt).split(/(\s+)/)) {
        yield token;
      }
    },
  };
}
