# ThreatConnect SOAR Integration

## Overview
This document outlines the tools available in the ThreatConnect integration for Chronicle SOAR.

## Tools

### `threat_connect_ping`
Test Connectivity.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=factory): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `threat_connect_enrich_entities`
Enrich IP addresses, hosts, URLs and hashes with information from ThreatConnect.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `owner_name` (Optional[str], optional, default=None): Owner name to fetch the data from. Parameter also accepts comma separated list of owner names.
*   `target_entities` (List[TargetEntity], optional, default=factory): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
