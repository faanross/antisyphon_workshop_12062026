# Threat Crowd Integration

This document describes the available tools for the Threat Crowd integration within the SecOps SOAR MCP Server. Threat Crowd is a system for searching and researching threats and their related infrastructure.

## Configuration

Ensure the Threat Crowd integration is configured in the SOAR platform. This integration likely uses public APIs and may not require specific instance configuration.

## Available Tools

### threat_crowd_ping
- **Description:** Test connectivity to the Threat Crowd service.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list. (Note: Likely not used for ping).
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty. (Note: Likely not used for ping).
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### threat_crowd_enrich_entities
- **Description:** Enrich entities (e.g., IP Address, Domain, Hash, Email) using Threat Crowd to identify related infrastructure and malware.
- **Supported Entities:** IP Address, Domain, Filehash, Email Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the entities to enrich. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the enrichment results from Threat Crowd, including related domains, IPs, hashes, emails, etc.
