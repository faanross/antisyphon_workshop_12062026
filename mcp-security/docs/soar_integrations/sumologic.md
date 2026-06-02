# Sumologic SOAR Integration

## Overview
This document outlines the tools available in the Sumologic SOAR integration. These tools allow interaction with Sumologic for searching logs and testing connectivity.

## Tools

### `sumologic_search`
Run a query and get search resutls from Sumologic

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `query` (str, required): Sumologic query to run. e.g: _collector=*
*   `delete_search_job` (Optional[bool], optional, default=None): If checked, delete the jobs after a search is completed.
*   `since` (Optional[str], optional, default=None): Start date of the search, ISO-8601 or unixtime (milliseconds). e.g. 1970-01-01T00:00:00. Default: Last 30 days.
*   `to` (Optional[str], optional, default=None): End date of the search, ISO-8601 or unixtime (milliseconds). e.g. 1970-01-01T00:00:00. Default: now (current utc unixtime).
*   `limit` (Optional[str], optional, default=None): Number of results to return. e.g. 10. Default: 25.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sumologic_ping`
Test Connectivity to Sumologic

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.
