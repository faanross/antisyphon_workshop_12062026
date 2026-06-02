# Candidate Field Guide

This schema guide defines candidate types: what each one detects, what its score measures, and which signals drive it. The scores in the workshop dataset are illustrative, curated values — they were authored to represent what a distillation pipeline would emit, not produced by a live scoring engine in this app. The full dimension-by-dimension scoring math is worked through only for the beacon example in Lab 02. It is injected as a compact reference, not as organization context.

## beacon
Regular, repeating network sessions grouped by source IP, destination IP, and port — the shape of automated check-ins (C2 implants, but also EDR agents, update services, and telemetry).
The score captures how *beacon-shaped* the traffic is, combining several weighted dimensions (the full breakdown is worked through in Lab 02): interval regularity (median inter-connection interval and its MAD — low jitter means high regularity), outbound and inbound byte consistency (similar payload sizes every beat), session-duration consistency, and the interval-histogram shape. These combine into a weighted composite (e.g. `regularity 0.998 × 0.35` + the other dimensions) that is clamped to `beacon_score`. A higher score means *more machine-like*, not more malicious.

Key fields: `beacon_score`, `regularity`, `median_interval_seconds`, `session_count`, `connection_count`, `bytes_out_consistency`, `bytes_in_consistency`, `bytes_ratio`, `destination_rarity`, `lots_match`, `threat_intel_match`, `process_name`, `parent_chain`.

Score interpretation: above `0.85` means highly regular. Benign services such as EDR, Microsoft 365, and backup agents routinely score high — the EDR heartbeat in this dataset outscores the real C2. Regularity alone is necessary but not sufficient; the detection skill separates malice using enrichment (LOTS match, destination rarity, process attribution).

## tls_anomaly
TLS handshake and certificate characteristics that deviate from normal web traffic.
The score reflects two signals: a JA3 / JA3S fingerprint check (the client/server TLS fingerprint compared against known-bad sets such as SSLBL) producing `fingerprint_anomaly_score`, and certificate red flags producing `cert_anomaly_score` — self-signed, subject equal to issuer, an implausible or local CN (e.g. `update-service.local`), and a suspicious validity window. Missing SNI and a direct-to-IP connection raise it further.

Key fields: `cert_anomaly_score`, `fingerprint_anomaly_score`, `ja3`, `ja3s`, `cert_self_signed`, `cert_subject`, `cert_issuer`, `cert_validity_days`, `missing_sni`, `connection_to_ip`.

Score interpretation: high when the fingerprint matches known C2 tooling or the certificate is self-signed / anomalous. Legitimate internal services with private CAs can also trip the self-signed check, so corroborate against destination and intel.

## intel_match
An observable (IP, domain, or hash) that matched a threat-intelligence source.
This score reflects the trustworthiness of the *intelligence*, not the behavior: the source's fidelity and how well the indicator is corroborated. `match_type` / `matched_value` identify what hit; `source`, `source_fidelity`, and `corroborated_fidelity` drive the confidence.

Key fields: `matched_value`, `matched_type`, `match_type`, `source`, `source_fidelity`, `corroborated_fidelity`, `first_reported`, `last_updated`, `confidence`.

Score interpretation: high means a high-fidelity, corroborated indicator. Intel can be stale or low-fidelity — check `first_reported` / `last_updated` and the source before treating a match as decisive.

## data_transfer
High-volume or asymmetric outbound transfer — the shape of data exfiltration.
The score reflects total outbound volume (`bytes_out_total`), the producer/consumer (out:in) ratio — heavily outbound traffic is upload-shaped — the `burstiness` of the flow, and `destination_rarity`. Large, asymmetric, bursty uploads to rarely-seen destinations score high.

Key fields: `data_transfer_score`, `bytes_out_total`, `bytes_in_total`, `burstiness`, `destination_rarity`, `dest_domain`, `process_guid`.

Score interpretation: high means a large, asymmetric, bursty egress to an unusual destination. Legitimate backups and cloud sync can look identical — the destination and whether it is a sanctioned service decide impact.

## unusual_parent_child_anomaly
A rare or suspicious process-lineage relationship (a parent process spawning an unexpected child).
The score reflects the fleet-wide rarity of the parent→child pair (`parent_child_pair_rarity` / its prevalence across hosts) and the rarity of the child process itself (`process_rarity`). Common pairs score near zero; rare ones — an editor spawning a shell, for instance — score high.

Key fields: `parent_child_pair_rarity`, `process_rarity`, `parent_process_name`, `process_name`, `parent_image`, `image`, `command_line`.

Score interpretation: high means the lineage is rare in this environment. Rarity is not malice on its own, but an unusual parent→child pair is a strong pivot into the rest of the chain.

## powershell_invocation_anomaly
A suspicious PowerShell command-line invocation.
The score reflects obfuscation and encoding signals: the encoded-command flag (`encoded_flag`), command-line entropy (`entropy_score` — randomness of the string), command-line length (`cmdline_length`), and `command_line_rarity`, together with the suspicious flag combination (`-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand`).

Key fields: `powershell_invocation_anomaly_score`, `encoded_flag`, `entropy_score`, `cmdline_length`, `command_line`, `parent_process_name`.

Score interpretation: high means an encoded, high-entropy, long, or rare command line. Administrators occasionally use encoded commands legitimately, so confirm intent against the parent process and surrounding activity.
