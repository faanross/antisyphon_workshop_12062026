---
name: hunt-data-exfiltration
version: 1.0
layer: detection
model: frontier
description: "Detect high-volume outbound transfer to unsanctioned cloud storage"
mitreTechniques: [T1041, T1567.002]
invocationTriggerCandidate: data_transfer
invocationGate:
  observedService: ssl
correlatingCandidates:
  - type: intel_match
    scope: destination
  - type: beacon
    scope: same_process_secondary_flow
---

# Objective

Assess whether a data_transfer candidate indicates exfiltration over HTTPS.

# Procedure

Load the data_transfer trigger. Evaluate total outbound bytes, producer-consumer ratio, burstiness, destination service, destination rarity, process attribution, and temporal relationship to other suspicious candidates. If the transfer is mediated by the same process as a C2 beacon, treat that as strong correlation. Distinguish malicious exfiltration from software downloads, backups, and sanctioned cloud storage.

# Output Contract

Return a DetectionFinding with dimensions for volume, asymmetry, destination risk, process attribution, and campaign correlation. Include uncertainties when content inspection is unavailable.
