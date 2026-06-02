---
name: assess-campaign-match
version: 1.0
layer: assessment
description: "Assess whether detection findings match known threat actor campaign profiles"
inputs:
  - "DetectionFinding (primary)"
contextRequirements:
  - id: threat-intel.campaign-corpus
    mode: retrieval
    path: data/rag/chunks.json
    reason: "Campaign matching needs semantic retrieval over a larger report corpus."
introducedInLab: 7
---

Match detection characteristics against known campaign profiles from the threat intelligence corpus. Compare infrastructure, tooling, process chain, execution method, and exfiltration behavior. Treat absence of a campaign match as absence of evidence, not proof the activity is benign.
