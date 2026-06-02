---
name: hunt-ai-tool-execution-anomaly
version: 2.0
layer: detection
model: frontier
description: "Detect AI-tool-coerced execution anomalies where an AI coding assistant spawns suspicious child processes"
mitreTechniques: [T1059.001, T1027, T1204.002]
invocationTriggerCandidate: unusual_parent_child_anomaly
invocationGate:
  parentImageContains: ["Code.exe", "Cursor.exe", "claude-code"]
correlatingCandidates:
  - type: powershell_invocation_anomaly
    scope: same_host
---

# Objective

Detect attacker-coerced AI coding assistant execution where an IDE or AI tool launches a suspicious command chain.

# Procedure

Load the unusual_parent_child_anomaly trigger candidate. Confirm whether the parent image is an AI-assisted development tool or IDE. Query correlating powershell_invocation_anomaly candidates on the same host. Score rare parent-child pairing, suspicious PowerShell invocation, and AI-tool suspicious spawn. Walk benign fallback patterns including documented VS Code extensions, build scripts, package manager postinstall hooks, and approved admin tooling.

# Output Contract

Return a DetectionFinding with dimensions for AI-tool parent, suspicious command execution, correlated encoded PowerShell, benign fallback analysis, and uncertainty.
