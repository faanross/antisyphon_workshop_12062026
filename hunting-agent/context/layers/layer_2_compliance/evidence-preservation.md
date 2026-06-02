# Evidence Preservation Policy

Before containment or cleanup, preserve enough evidence to support incident response and later review.

## Minimum Evidence

- Endpoint process lineage and command lines
- Network connection records
- Binary path, hash, signer, and creation timestamp where available
- Related user session and privilege information
- Linked transfer evidence if exfiltration is possible

## Handling Guidance

For high-severity developer workstation findings, avoid immediate destructive cleanup unless there is active harm. Prefer network isolation or containment that preserves disk, memory, and logs.
