# Unshorten Me Integration

This document describes the available tools for the Unshorten Me integration within the SecOps SOAR MCP Server. Unshorten Me is a service used to resolve shortened URLs to their original, long URLs.

## Configuration

Ensure the Unshorten Me integration is configured in the SOAR platform. This integration likely uses the public Unshorten Me service and may not require specific instance configuration.

## Available Tools

### unshorten_me_unshorten_url
- **Description:** Resolve short URL entities to their original long URLs using the Unshorten Me service.
- **Supported Entities:** URL
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the shortened URL(s). Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the results, including the resolved long URLs.

### unshorten_me_ping
- **Description:** Test connectivity to the Unshorten Me service.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.
