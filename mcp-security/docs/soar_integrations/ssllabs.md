# SSLLabs SOAR Integration

## Overview

This integration provides tools for interacting with SSL Labs from within the Chronicle SOAR platform. It allows testing connectivity and analyzing the SSL/TLS configuration of hosts or URLs.

## Tools

### `ssl_labs_ping`

Test connectivity to SSL Labs

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssl_labs_analyse_entity`

Analyse a host or a URL

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
