# Portnox Integration

The Portnox integration for Chronicle SOAR allows interaction with the Portnox Network Access Control (NAC) platform (often Portnox CORE or Portnox CLEAR). This enables security teams to automate network containment actions and retrieve device context as part of incident response workflows.

## Overview

Portnox provides cloud-native and on-premises NAC solutions that offer visibility and control over devices connecting to corporate networks (wired, wireless, VPN). It helps enforce security policies, assess device compliance, and restrict access for non-compliant or potentially compromised endpoints.

This integration typically allows Chronicle SOAR to:

*   **Retrieve Device Information:** Get details about devices known to Portnox, such as IP address, MAC address, OS, compliance status, and currently assigned network access level or VLAN.
*   **Network Containment:** Quarantine or restrict network access for specific devices identified during an investigation.
*   **Modify Access:** Change the network access level or policy applied to a device.
*   **Un-Quarantine:** Restore network access for a device once remediation is complete.

## Key Actions

The following actions are available through the Portnox integration:

*   **Get Device Locations (`portnox_get_device_locations`)**
    *   Description: Get the locations of a device (likely based on network connection points).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (e.g., IP Address, MAC Address).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Installed Applications (`portnox_get_installed_applications`)**
    *   Description: Get a list of all installed applications on a device.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (e.g., IP Address, MAC Address).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get User History (`portnox_get_user_history`)**
    *   Description: Get the user authentication history associated with a device.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (e.g., IP Address, MAC Address).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Revalidate Device (`portnox_revalidate_device`)**
    *   Description: Revalidate device policy over Portnox NAC using the Portnox internal device ID.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `device_id` (string, required): The Portnox internal device ID to revalidate.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Enrich Device (`portnox_enrich_device`)**
    *   Description: Enrich a device entity with additional information from Portnox.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (e.g., IP Address, MAC Address).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`portnox_ping`)**
    *   Description: Test Connectivity to the Portnox API.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Services (`portnox_get_services`)**
    *   Description: Get a list of all services running on a device.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (e.g., IP Address, MAC Address).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Open Ports (`portnox_get_open_ports`)**
    *   Description: Get a list of all open ports on a device.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (e.g., IP Address, MAC Address).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Device History (`portnox_get_device_history`)**
    *   Description: Get device history (e.g., connection events, policy changes) within a specified time frame.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `days_backwards` (string, required): Fetch history 'x' days backwards (e.g., "1").
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (e.g., IP Address, MAC Address).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Revalidate Device By Address (`portnox_revalidate_device_by_address`)**
    *   Description: Revalidate a device by its IP address or MAC address.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (IP Address or MAC Address) to revalidate.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

## Use Cases

*   **Automated Endpoint Containment:** When an EDR or SIEM alert indicates a compromised endpoint, automatically trigger a SOAR playbook to quarantine the device using the Portnox integration, limiting lateral movement.
*   **Compliance Enforcement:** If a vulnerability scan finding (from another integration) identifies a critical vulnerability on a device, use Portnox to move it to a remediation network segment.
*   **Device Enrichment:** Enrich SOAR entities (IP, MAC address) with contextual information from Portnox, such as device type, owner, and compliance status.
*   **Incident Response:** Allow analysts to quickly isolate or un-isolate devices directly from the SOAR case interface during an active investigation.

## Configuration

*(Details on configuring the integration, including obtaining Portnox API credentials, specifying the Portnox instance URL/IP address, and configuring settings within the SOAR platform, should be added here.)*
