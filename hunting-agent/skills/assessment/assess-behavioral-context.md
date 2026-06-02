---
name: assess-behavioral-context
version: 1.0
layer: assessment
description: "Assess whether detected activity deviates from the entity's established behavioral baseline"
inputs:
  - "DetectionFinding (primary)"
contextRequirements:
  - id: asset.dev-ws03
    mode: static
    path: context/layers/layer_1_assets/dev-ws03.md
    reason: "Host role and expected development activity."
  - id: user.jane-roberts
    mode: static
    path: context/layers/layer_1_assets/jane-roberts.md
    reason: "User role, normal tools, and privilege baseline."
  - id: incidents.dev-ws03-history
    mode: static
    path: context/layers/layer_5_incidents/dev-ws03-history.md
    reason: "Prior host-specific investigation history."
  - id: incidents.subnet-10-42-10-history
    mode: static
    path: context/layers/layer_5_incidents/subnet-10-42-10-history.md
    reason: "Known false-positive pattern for the subnet."
---

Evaluate whether the detection finding is normal or anomalous for the specific user and host. Consult host role, user group membership, normal tools, prior incident history, and known false-positive patterns. Call out what is baseline-consistent and what is materially different.
