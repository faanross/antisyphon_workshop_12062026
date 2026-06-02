# Asset Context: DEV-WS03

DEV-WS03 is a Windows 11 developer workstation assigned to Platform Engineering at Northwind Research.

## Asset Role

- Owner team: Platform Engineering
- Business function: internal developer platform and build tooling
- Device class: workstation
- Criticality: medium by device class, elevated by user privileges
- Normal work hours: weekdays 08:00-18:00 America/New_York

## Expected Activity

Expected software includes VS Code, git, npm, package managers, internal build tools, approved EDR, Microsoft 365, and short administrative PowerShell commands.

Unexpected activity includes unsigned executables from user temp paths, long-running unexplained outbound HTTPS sessions, unknown destinations not tied to approved SaaS, encoded PowerShell, and developer-tool child processes that launch suspicious payloads.

## Operational Significance

Because this host participates in platform engineering work, compromise can affect source code, build scripts, credentials, and CI/CD workflow integrity.
