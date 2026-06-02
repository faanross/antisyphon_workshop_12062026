# Symantec Blue Coat ProxySG Integration

This document describes the available tools for the Symantec Blue Coat ProxySG integration within the SecOps SOAR MCP Server. This integration allows interaction with the ProxySG appliance for tasks like blocking and enrichment.

## Configuration

Ensure the Symantec Blue Coat ProxySG integration is configured in the SOAR platform with the necessary API credentials, IP address, and instance details.

## Available Tools

### symantec_blue_coat_proxy_sg_block_entities
- **Description:** Block entities (IP Address) using Symantec Blue Coat ProxySG.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address(es) to block. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the block action execution.

### symantec_blue_coat_proxy_sg_ping
- **Description:** Test connectivity to the Symantec Blue Coat ProxySG instance configured in the SOAR platform.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### symantec_blue_coat_proxy_sg_enrich_entities
- **Description:** Enrich entities (Hostname, IP Address, URL) using information from Symantec Blue Coat ProxySG, likely related to categorization or reputation.
- **Supported Entities:** Hostname, IP Address, URL
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `create_insight` (bool, optional): If enabled, create an insight containing retrieved information. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the enrichment results from ProxySG.
