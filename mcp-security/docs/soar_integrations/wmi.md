# WMI (Windows Management Instrumentation) Integration

This document describes the available tools for the WMI integration within the SecOps SOAR MCP Server. WMI allows querying and managing Windows systems remotely.

## Configuration

Ensure the WMI integration is configured in the SOAR platform. Actions require the target server address and potentially username/password credentials depending on the target system's configuration and permissions.

## Available Tools

### wmi_run_query
- **Description:** Run an arbitrary WQL (WMI Query Language) query on a target Windows system.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `server_address` (str, required): The IP address or hostname of the target Windows system.
    - `wql_query` (str, required): The WQL query to execute (e.g., `SELECT Caption, Description FROM Win32_LogicalDisk WHERE DriveType <> 3`).
    - `username` (str, optional): Username for connecting to the target system. Defaults to None (uses SOAR agent credentials if applicable or integration defaults).
    - `password` (str, optional): Password for the specified username. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the results of the WQL query.

### wmi_ping
- **Description:** Test connectivity to a target Windows system using WMI with the configured credentials.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### wmi_list_services
- **Description:** Get a list of installed services from a target Windows system via WMI.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `server_address` (str, required): The IP address or hostname of the target Windows system.
    - `username` (str, optional): Username for connecting to the target system. Defaults to None.
    - `password` (str, optional): Password for the specified username. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the list of services found.

### wmi_get_system_info
- **Description:** Get general system information from a target Windows system via WMI.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `server_address` (str, required): The IP address or hostname of the target Windows system.
    - `username` (str, optional): Username for connecting to the target system. Defaults to None.
    - `password` (str, optional): Password for the specified username. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing system information (e.g., OS details, hardware info).

### wmi_list_users
- **Description:** List all user accounts configured on a target Windows system via WMI.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `server_address` (str, required): The IP address or hostname of the target Windows system.
    - `username` (str, optional): Username for connecting to the target system. Defaults to None.
    - `password` (str, optional): Password for the specified username. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing a list of user accounts found on the system.
