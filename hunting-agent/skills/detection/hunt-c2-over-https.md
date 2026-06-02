---
name: hunt-c2-over-https
version: 2.0
layer: detection
model: frontier
description: "Detect likely C2 beaconing over HTTPS by fusing beacon, TLS, intel, and process-mediated transfer candidates"
mitreTechniques: [T1071.001, T1573.002, T1041]
invocationTriggerCandidate: beacon
invocationGate:
  observedService: ssl
  minBeaconScore: 0.85
correlatingCandidates:
  - type: tls_anomaly
    scope: same_network_tuple
  - type: intel_match
    scope: destination
  - type: data_transfer
    scope: same_process_secondary_flow
---

# Objective

Determine whether an HTTPS beacon candidate represents command-and-control rather than benign regular traffic. Reason **only** from candidate evidence — do not read asset records, threat-intel RAG, or compliance / business-impact context. Those belong to assessment skills, not detection.

# Procedure

Load the trigger beacon candidate first. Inspect its beacon score, destination rarity, LOTS status, threat-intel fields, and process attribution. Then inspect the correlating TLS anomaly, intel match, and data transfer candidates on their declared scopes. Treat an absent correlating candidate as **absent evidence — score 0 on its dimension** — not as execution failure. Never phantom-score an absent candidate.

# Scoring

The dimensions are **passthroughs of the candidates' own composite scores** — you select and fuse them, you do not re-derive them:

- `statistical_beacon_pattern` = `beacon.compositeScore`
- `infrastructure_reputation`  = `intel_match.compositeScore`   (0.0 if absent)
- `tls_anomaly_signature`      = `tls_anomaly.compositeScore`    (0.0 if absent)

`compositeScore = max(statistical_beacon_pattern, infrastructure_reputation, tls_anomaly_signature)` — the **maximum decisive malicious dimension, never an average** that washes out strong evidence.

`process_mediated_secondary_transfer` = `data_transfer.compositeScore` is **related activity, kept separate**. It can raise overall incident concern, but it must NOT enter the `max()` above, inflate the C2 composite, or redefine the C2 destination — the secondary flow may go to a different endpoint.

For each fired dimension, write an `evidence` string citing the **decisive observation** from the source candidate (e.g. *"tls_anomaly 0.95 — JA3 matches SSLBL; self-signed cert"*), not just the score.

# Benign fallbacks

Rule out benign causes by matching the observed evidence against each cause's shape: EDR / monitoring-agent check-in, OS update or telemetry polling, Microsoft 365 keepalive, backup agent, browser / SaaS polling, human browsing. List the ones ruled out in `benignFallbackRuledOut`; for any that cannot be confidently ruled out, say so in the narrative. (Most false positives are already dampened upstream by candidate-layer enrichments such as `destination_rarity` and `ja3_rarity`.)

# Output Contract

Return a `DetectionFinding` with `compositeScore`, `dimensions`, `evidenceSummary`, `attackNarrative`, `uncertainty`, `benignFallbackRuledOut`, `mitreTechniques`, and `evidenceRefs` (the candidate IDs that fired plus their constituent event IDs). Every assertion in the narrative must trace to a candidate field or a skill-derived observation — **no unsourced claims**.

# Anti-patterns — do not do

- Re-scoring JA3 / certificate / SNI from raw `ssl.log` or `x509.log` — the `tls_anomaly` candidate already scores these; consume its composite, not the underlying events.
- Treating an absent correlating candidate as 1.0 via phantom scoring — absent is 0 on that dimension; the other dimensions still carry the composite via `max()`.
- Folding process-mediated secondary transfer into the C2 composite — it is related activity, scored and reported separately.
