# Input Schema — Bringing Your Own Data

`mini-distillation` does **not** read raw Zeek logs or raw Sysmon EVTX/XML. It reads a
single stream of **already-normalized events**: a unified shape where every record —
whether it came from Zeek or Sysmon — carries the same three required fields plus a
per-type payload.

In the full system, turning raw `conn.log` / `ssl.log` / Sysmon into this shape is the
collector's job (the "housekeeping" stage). This CLI is the scoring brain that runs
*after* that step. So to use your own data, you normalize it into the schema below, then
point the tool at the file.

```bash
npm run distill -- score all  ./my-events.json
npm run distill -- score all  ./my-events.ndjson --out candidates.ndjson
```

---

## File format

The events file is either:

- a **JSON array** of event objects, e.g. `[ {…}, {…} ]`, or
- **NDJSON** — one JSON object per line (no enclosing array, no commas).

Use NDJSON for large captures; it streams line by line.

## Required fields (every event)

Validation only enforces these three. Anything missing or invalid drops the event.

| Field | Type | Notes |
|---|---|---|
| `source` | string | e.g. `"zeek"` or `"sysmon"` — non-empty |
| `event_type` | string | the discriminator (see below) — non-empty |
| `timestamp` | string | ISO 8601, must be `Date.parse`-able, e.g. `"2026-05-01T00:00:07.000Z"` |
| `id` | string | a stable unique id; **auto-generated if you omit it** |

Each scorer then reads its own `event_type` and ignores the rest, so you can mix all
three kinds in one file. Extra fields are allowed and preserved (`[key: string]: unknown`).

---

## Event types

### 1. Zeek `conn` → beacon scorer (`score beacon`)

One record per `conn.log` connection.

| Field | Type | Required | Maps from Zeek |
|---|---|---|---|
| `source` | `"zeek"` | yes | — |
| `event_type` | `"conn"` | yes | — |
| `src_ip` | string | yes | `id.orig_h` |
| `dest_ip` | string | yes | `id.resp_h` |
| `dest_port` | number | yes | `id.resp_p` |
| `proto` | string | yes | `proto` |
| `src_port` | number | no | `id.orig_p` |
| `service` | string | no | `service` |
| `conn_state` | string | no | `conn_state` |
| `duration` | number (seconds) | no | `duration` |
| `orig_bytes` | number | no | `orig_bytes` (payload bytes out) |
| `resp_bytes` | number | no | `resp_bytes` (payload bytes in) |
| `orig_pkts` | number | no | `orig_pkts` |
| `resp_pkts` | number | no | `resp_pkts` |
| `history` | string | no | `history` |
| `zeek_uid` | string | no | `uid` |

> Beaconing is detected from **timing regularity + byte/duration consistency across many
> connections** to the same `dest_ip:dest_port`. You need a run of connections over time
> for a candidate to form — a single row scores nothing.

### 2. Zeek `ssl` → TLS anomaly scorer (`score tls`)

One record per `ssl.log` handshake.

| Field | Type | Required | Maps from Zeek |
|---|---|---|---|
| `source` | `"zeek"` | yes | — |
| `event_type` | `"ssl"` | yes | — |
| `src_ip` | string | yes | `id.orig_h` |
| `dest_ip` | string | yes | `id.resp_h` |
| `dest_port` | number | yes | `id.resp_p` |
| `server_name` | string \| null | yes | `server_name` (SNI) |
| `tls_version` | string \| null | yes | `version` |
| `cipher` | string \| null | yes | `cipher` |
| `ja3_hash` | string \| null | yes | `ja3` |
| `ja4_hash` | string \| null | yes | `ja4` |
| `ja3s_hash` | string \| null | yes | `ja3s` |
| `ja4x_hash` | string \| null | yes | `ja4x` |
| `sni_matches_cert` | boolean \| null | yes | derived |
| `cert_subject` | string \| null | yes | x509 `certificate.subject` |
| `cert_issuer` | string \| null | yes | x509 `certificate.issuer` |
| `cert_serial` | string \| null | yes | x509 `certificate.serial` |
| `cert_not_before` | string \| null | yes | x509 validity start |
| `cert_not_after` | string \| null | yes | x509 validity end |
| `cert_self_signed` | boolean | yes | derived (subject == issuer) |
| `cert_expired` | boolean | yes | derived |
| `cert_validity_days` | number \| null | yes | derived |
| `cert_key_type` | string \| null | yes | x509 key type |
| `cert_key_length` | number \| null | yes | x509 key length |
| `cert_san_dns` | string[] | yes | x509 SAN DNS names (`[]` if none) |
| `cert_chain_length` | number | yes | chain depth |
| `connection_to_ip` | boolean | yes | true if no SNI / dialed by IP |

> TLS fields come from joining Zeek's `ssl.log` with `x509.log`. Self-signed certs, short
> validity windows, SNI-less IP connections, and known-bad JA3/JA4 fingerprints drive the
> score. Use `null` where a value genuinely isn't present rather than omitting the key.

### 3. Sysmon `process_create` (Event ID 1) → PowerShell scorer (`score powershell`)

One record per Sysmon EID 1.

| Field | Type | Required | Maps from Sysmon EID 1 |
|---|---|---|---|
| `source` | `"sysmon"` | yes | — |
| `event_type` | `"process_create"` | yes | — |
| `event_id` | `1` | yes | EventID |
| `host` | string | yes | Computer |
| `process_name` | string | yes | basename of `Image` |
| `process_path` | string | yes | `Image` |
| `process_id` | number | yes | `ProcessId` |
| `process_guid` | string | yes | `ProcessGuid` |
| `parent_process_name` | string | yes | basename of `ParentImage` |
| `parent_process_path` | string | yes | `ParentImage` |
| `parent_process_guid` | string | yes | `ParentProcessGuid` |
| `parent_process_id` | number | no | `ParentProcessId` |
| `user` | string | yes | `User` |
| `integrity_level` | string | no | `IntegrityLevel` |
| `original_file_name` | string \| null | yes | `OriginalFileName` |
| `description` | string \| null | yes | `Description` |
| `product` | string \| null | yes | `Product` |
| `company` | string \| null | yes | `Company` |
| `command_line` | string | yes | `CommandLine` |

> The scorer detects PowerShell run under a renamed binary, from a non-canonical host
> path, under a suspicious parent, or with offensive command-line shapes (encoded
> commands, download cradles, etc.). `original_file_name` vs `process_name` mismatch is how
> renames are caught — keep both accurate.

### 4. Sysmon `image_load` (Event ID 7) — optional corroboration

Only used to corroborate custom-host PowerShell (`System.Management.Automation.dll`
loaded into a non-PowerShell process). Safe to omit entirely.

| Field | Type | Required | Maps from Sysmon EID 7 |
|---|---|---|---|
| `source` | `"sysmon"` | yes | — |
| `event_type` | `"image_load"` | yes | — |
| `event_id` | `7` | yes | EventID |
| `host` | string | yes | Computer |
| `process_name` | string | yes | basename of `Image` |
| `image` | string | yes | `Image` (loading process) |
| `process_id` | number | yes | `ProcessId` |
| `process_guid` | string | yes | `ProcessGuid` |
| `image_loaded` | string | yes | `ImageLoaded` (the DLL) |

---

## Normalizing your own logs

The field names above are deliberately a clean superset of Zeek's column names and
Sysmon's EID fields, so a normalizer is mostly a **rename + reshape**, not a rewrite.

**Zeek** already emits JSON when you enable `LogAscii::use_json=T` (or via
`zeek-cut` / a JSON export). The TLS rows require joining `ssl.log` with `x509.log` on the
cert id, then deriving the booleans (`cert_self_signed`, `cert_expired`, …).

**Sysmon** XML/EVTX → JSON via your shipper (Winlogbeat, Sysmon's own JSON, etc.), then
map `Image`→`process_path` + basename→`process_name`, and so on.

A tiny `jq` or Python adapter that walks your exported logs and emits this schema as
NDJSON is all you need. See `examples/events.sample.json` for a complete, valid example of
all three core types in one file.
