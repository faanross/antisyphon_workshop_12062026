# TalosThreatSource SOAR Integration

## Overview
This document outlines the tools available in the Talos ThreatSource SOAR integration. These tools allow interaction with Talos ThreatSource for retrieving reputation and Whois information for entities, and testing connectivity.

## Tools

### `talos_get_reputation`
Enrich entities using information from the Talos ThreatSource. Supported entities: IP Address, Hostname, URLs. Note: action takes the domain part from URL entities. Note: Action is running as async, please adjust script timeout value in Siemplify IDE for action as needed. Between each submission action waits, so that access won't be blocked.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `talos_ping`
Test Connectivity

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `talos_whois`
Retrieve Whois information about entities using Talos ThreatSource. Supported entities: IP Address, Hostname, URLs. Note: action takes the domain part from URL entities. Note: Action is running as async, please adjust script timeout value in Siemplify IDE for action as needed. Between each submission action waits, so that access won’t be blocked.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.
