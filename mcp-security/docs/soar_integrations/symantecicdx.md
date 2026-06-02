# SymantecICDX SOAR Integration

## Overview
This document outlines the tools available in the Symantec ICDx SOAR integration. These tools allow interaction with Symantec ICDx for retrieving events and testing connectivity.

## Tools

### `symantec_icdx_get_events_minutes_back`
Get events for query, minutes back.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `query` (str, required): Request query.
*   `limit` (Optional[str], optional, default=None): Received events amount limit.
*   `minutes_back` (Optional[str], optional, default=None): Fetch events minutes back parameter.
*   `fields` (Optional[str], optional, default=None): Specific event fields to bring(Comma separated.)
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `symantec_icdx_ping`
Test SymantecICDX connectivity.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `symantec_icdx_get_event`
Get event data by it's ID.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `event_uuid` (str, required): Event UUID
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.
