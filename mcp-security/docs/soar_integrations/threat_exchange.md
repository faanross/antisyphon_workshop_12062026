# ThreatExchange SOAR Integration

## Overview
This document outlines the tools available in the ThreatExchange integration for Chronicle SOAR.

## Tools

### `threat_exchange_get_reputations`
Get reputations for a given entity.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=factory): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `threat_exchange_ping`
Test Connectivity.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=factory): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
