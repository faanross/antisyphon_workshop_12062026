# IBM X-Force Exchange Integration

This document describes the available tools for the IBM X-Force Exchange integration within the SecOps SOAR MCP Server. X-Force Exchange is a threat intelligence platform.

## Configuration

Ensure the X-Force Exchange integration is configured in the SOAR platform with the necessary API Key and API Password.

## Available Tools

### x_force_get_hash_info
- **Description:** Query X-Force Exchange for reputation and details about a file hash.
- **Supported Entities:** Filehash (MD5, SHA1, SHA256)
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `threshold` (str, optional): Specify a threshold (e.g., "low", "medium", "high") to potentially filter results or influence risk scoring. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the Filehash. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing information about the hash, including reputation, associated malware families, etc.

### x_force_get_ip_info
- **Description:** Query X-Force Exchange for reputation and details about an IP address.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `threshold` (str, optional): Specify a risk score threshold (integer, e.g., "3") to potentially filter results or influence risk scoring. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing information about the IP address, including reputation, geolocation, associated categories, etc.

### x_force_ping
- **Description:** Test connectivity to the IBM X-Force Exchange API using the configured credentials.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### x_force_get_url_info
- **Description:** Query X-Force Exchange for reputation and details about a URL.
- **Supported Entities:** URL
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `threshold` (str, optional): Specify a risk score threshold (integer, e.g., "3") to potentially filter results or influence risk scoring. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the URL. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing information about the URL, including reputation, categorization, etc.

### x_force_get_ip_by_category
- **Description:** Retrieve IP addresses associated with a specific category from X-Force Exchange. (Note: The description in the code is missing, this is inferred).
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `category` (str, required): The category name to search for associated IPs (e.g., "Malware", "Scanning IPs").
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing a list of IP addresses associated with the specified category.

### x_force_get_ip_malware
- **Description:** Query X-Force Exchange for known malware families associated with an IP address.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing information about malware families associated with the IP address.
