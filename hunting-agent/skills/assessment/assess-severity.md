---
name: assess-severity
version: 1.0
layer: assessment
description: "Assess operational severity of a DetectionFinding using business and asset context"
inputs:
  - "DetectionFinding (primary)"
contextRequirements:
  - id: asset.dev-ws03
    mode: static
    path: context/layers/layer_1_assets/dev-ws03.md
    reason: "Host role, criticality, owner team, and blast radius."
  - id: compliance.escalation-policy
    mode: static
    path: context/layers/layer_2_compliance/escalation-policy.md
    reason: "Severity-to-response mapping and escalation deadlines."
  - id: compliance.evidence-preservation
    mode: static
    path: context/layers/layer_2_compliance/evidence-preservation.md
    reason: "Evidence handling constraints before containment."
  - id: incidents.dev-ws03-history
    mode: static
    path: context/layers/layer_5_incidents/dev-ws03-history.md
    reason: "Prior host-specific investigation history."
---

# Objective

Assign an operational severity to a detection finding using the supplied organization context.

# Procedure

Separate technical confidence from business impact. Consider host role, user privileges, blast radius, compliance scope, active exfiltration indicators, and uncertainty. Recommend evidence-preserving response actions before cleanup.

# Output Contract

Return severity, operational bottom line, business impact, escalation rationale, recommended response, and uncertainty.
