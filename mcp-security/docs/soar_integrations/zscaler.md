# Zscaler Integration

This document describes the available tools for the Zscaler integration within the SecOps SOAR MCP Server. Zscaler provides cloud security services, including secure web gateways and sandboxing.

## Configuration

Ensure the Zscaler integration is configured in the SOAR platform with your Zscaler cloud name, API key, username, and password.

## Available Tools

### zscaler_get_url_categories
- **Description:** Gets information about all defined URL categories in Zscaler.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `display_url` (bool, required): Set to `true` to include the list of URLs within each category in the response.
    - `target_entities` (List[TargetEntity], optional): Specific target entities. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the list of URL categories and optionally their associated URLs.

### zscaler_add_to_blacklist
- **Description:** Adds URL, Domain, or IP address entities to the Zscaler blacklist.
- **Supported Entities:** URL, Hostname (Domain), IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (URL, Hostname, IP Address) to add to the blacklist. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the result of the blacklist operation.

### zscaler_ping
- **Description:** Test connectivity to the Zscaler API using the configured credentials.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### zscaler_get_whitelist
- **Description:** Gets the list of currently whitelisted URLs/IPs from Zscaler.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the list of whitelisted items.

### zscaler_add_to_whitelist
- **Description:** Adds URL, Domain, or IP address entities to the Zscaler whitelist.
- **Supported Entities:** URL, Hostname (Domain), IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (URL, Hostname, IP Address) to add to the whitelist. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the result of the whitelist operation.

### zscaler_remove_from_blacklist
- **Description:** Removes URL, Domain, or IP address entities from the Zscaler blacklist.
- **Supported Entities:** URL, Hostname (Domain), IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (URL, Hostname, IP Address) to remove from the blacklist. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the result of the removal operation.

### zscaler_get_blacklist
- **Description:** Gets the list of currently blacklisted URLs/IPs from Zscaler.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the list of blacklisted items.

### zscaler_lookup_entity
- **Description:** Look up the Zscaler categorization for URL, Domain, or IP address entities.
- **Supported Entities:** URL, Hostname (Domain), IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (URL, Hostname, IP Address) to look up. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the categorization results for the entities.

### zscaler_remove_from_whitelist
- **Description:** Removes URL, Domain, or IP address entities from the Zscaler whitelist.
- **Supported Entities:** URL, Hostname (Domain), IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (URL, Hostname, IP Address) to remove from the whitelist. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the result of the removal operation.

### zscaler_get_sandbox_report
- **Description:** Get the full Zscaler Sandbox analysis report for a given MD5 file hash.
- **Supported Entities:** Filehash (MD5)
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entity (MD5 Filehash) to get the report for. Defaults to empty list.
    - `scope` (str, optional): Defines the scope ("All entities"). Defaults to "All entities".
- **Returns:** (dict) A dictionary containing the Zscaler Sandbox report details.
