# Tor Integration

This document describes the available tools for the Tor integration within the SecOps SOAR MCP Server. This integration checks IP addresses against the Tor exit node list.

## Configuration

Ensure the Tor integration is configured in the SOAR platform. This integration likely uses public Tor exit node lists and may not require specific instance configuration.

## Available Tools

### tor_is_exit_node
- **Description:** Check whether one or more IP address entities are currently listed as Tor exit nodes.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address(es) to check. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the results, indicating which IPs are Tor exit nodes.

### tor_ping
- **Description:** Test connectivity related to the Tor integration setup (likely checks access to the Tor exit node list source).
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.
