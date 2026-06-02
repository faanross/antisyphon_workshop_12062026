# Escalation Policy

Northwind Research operates a 12-person SOC with 24x5 coverage.

## Severity Mapping

| Severity | Response expectation |
|---|---|
| Critical | Immediate SOC lead notification and IR page |
| High | Same-day containment decision and evidence preservation |
| Medium | Analyst follow-up in queue with defined evidence requests |
| Low | Document, monitor, and close with rationale |

## Escalation Factors

Raise severity when a detection involves privileged engineering users, build infrastructure, source-code workflows, unknown external infrastructure, linked data transfer, or evidence of active command execution.

Lower severity only when a benign owner, approved service, expected change window, and complete process attribution are all present.
