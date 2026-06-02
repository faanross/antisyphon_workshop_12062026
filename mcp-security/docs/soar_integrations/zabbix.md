# Zabbix Integration

This document describes the available tools for the Zabbix integration within the SecOps SOAR MCP Server. Zabbix is an open-source monitoring solution.

## Configuration

Ensure the Zabbix integration is configured in the SOAR platform with the Zabbix server URL, API username, and API password.

## Available Tools

### zabbix_ping
- **Description:** Test connectivity to the Zabbix server using the configured credentials.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### zabbix_execute_script
- **Description:** Execute a predefined script on Zabbix hosts identified by IP address entities.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `script_name` (str, required): The name of the script (defined in Zabbix) to execute.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address(es) of the target hosts. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the script execution attempt on the targeted hosts.
