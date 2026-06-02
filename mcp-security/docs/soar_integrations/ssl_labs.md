# SSL Labs Integration

This document describes the available tools for the SSL Labs integration within the SecOps SOAR MCP Server. SSL Labs provides tools to inspect and analyze the SSL/TLS configuration of web servers.

## Configuration

Ensure the SSL Labs integration is configured in the SOAR platform. Note that this integration typically uses public SSL Labs APIs and may not require specific instance configuration beyond potentially managing API rate limits if using the official API heavily.

## Available Tools

### ssl_labs_ping
- **Description:** Test connectivity to the SSL Labs service.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list. (Note: Likely not used for ping).
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty. (Note: Likely not used for ping).
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### ssl_labs_analyse_entity
- **Description:** Analyze the SSL/TLS configuration of a host or URL using SSL Labs.
- **Supported Entities:** Hostname, URL
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the Hostname or URL to analyze. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the SSL/TLS analysis results from SSL Labs.
