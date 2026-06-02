# URLVoid SOAR Integration

## Overview

This document outlines the tools available for the URLVoid integration within the SOAR platform. These tools allow interaction with the URLVoid API for testing connectivity and checking domain reputation against various blacklists.

## Tools

### `url_void_ping`

Test Connectivity.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `url_void_get_domain_reputation`

Check if a domain is blacklisted by popular and trusted domain blacklist services.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `threshold` (str, required): Domain risk threshold.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
