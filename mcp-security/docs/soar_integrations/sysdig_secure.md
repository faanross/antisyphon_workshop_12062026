# Sysdig Secure Integration

This document describes the available tools for the Sysdig Secure integration within the SecOps SOAR MCP Server. Sysdig Secure provides cloud security posture management (CSPM), cloud workload protection (CWPP), and container security.

## Configuration

Ensure the Sysdig Secure integration is configured in the SOAR platform with the necessary API token and endpoint URL.

## Available Tools

### sysdig_secure_ping
- **Description:** Test connectivity to the Sysdig Secure instance configured in the SOAR platform.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.
