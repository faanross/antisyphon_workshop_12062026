# SolarWindsOrion SOAR Integration

## Overview

This integration provides tools for interacting with SolarWinds Orion from within the Chronicle SOAR platform. It allows testing connectivity, executing queries (including entity-based queries), and enriching endpoint information.

## Tools

### `solar_winds_orion_execute_query`

Execute query in SolarWinds Orion.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `query` (str, required): Specify the query that needs to be executed. Note: SolarWind queries don’t support “*” notation.
*   `max_results_to_return` (Optional[str], optional, default=None): Specify how many results should be returned.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `solar_winds_orion_enrich_endpoint`

Fetch endpoint's system information by its hostname or IP address.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `solar_winds_orion_ping`

Test connectivity to the SolarWinds Orion with parameters provided at the integration configuration page on the Marketplace tab.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `solar_winds_orion_execute_entity_query`

Execute query in SolarWinds Orion based on the IP and Hostname entities.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `query` (str, required): Specify the query that needs to be executed. Note: SolarWind queries don’t support “*” notation and you shouldn’t have a WHERE clause in the query, because it is added by the action. Please refer to the action documentation for details.
*   `ip_entity_key` (Optional[str], optional, default=None): Specify what key should be used with IP entities in the WHERE clause of the query. Please refer to the action documentation for details. Default: IpAddress.
*   `hostname_entity_key` (Optional[str], optional, default=None): Specify what key should be used with Hostname entities in the WHERE clause of the query. Please refer to the action documentation for details. Default: Hostname
*   `max_results_to_return` (Optional[str], optional, default=None): Specify how many results should be returned.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
