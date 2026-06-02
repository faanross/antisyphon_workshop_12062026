---
name: hunt-suspicious-process-chain
version: 1.0
layer: detection
model: frontier
description: "Detect suspicious process chains involving script interpreters and masquerading child processes"
mitreTechniques: [T1059.001, T1036.005]
invocationTriggerCandidate: unusual_parent_child_anomaly
invocationGate:
  minScore: 0.5
correlatingCandidates:
  - type: powershell_invocation_anomaly
    scope: same_host
  - type: beacon
    scope: same_process_secondary_flow
---

# Objective

Assess whether a process chain indicates malicious execution and masquerading.

# Procedure

Load the parent-child anomaly and reconstruct the parent, child, and grandparent chain. Evaluate whether the child image path matches its name, whether the command line is suspicious, whether the chain connects to encoded PowerShell, and whether the process later owns network beaconing. Rule out normal developer tooling and administrative shells where evidence supports benign use.

# Output Contract

Return a DetectionFinding with process-chain evidence, masquerading assessment, related network activity, MITRE mapping, and uncertainty.
