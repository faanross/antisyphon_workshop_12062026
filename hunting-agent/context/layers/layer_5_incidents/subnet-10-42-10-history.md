# Prior Incident Context: 10.42.10.0/24

The last investigation involving `10.42.10.0/24` occurred on 2026-01-15 and was closed as benign EDR heartbeat activity.

## False-Positive Pattern

That prior case involved stable outbound traffic to approved EDR infrastructure with a known vendor process, valid signer, and destination ownership.

## Difference From Current Finding

The current C2-over-HTTPS finding involves `svchost-health.exe` running from a user temp path and a rare destination without a LOTS explanation. That differs from the known benign EDR heartbeat pattern.
