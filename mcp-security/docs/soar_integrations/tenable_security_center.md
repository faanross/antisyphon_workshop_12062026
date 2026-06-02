# Tenable Security Center (Tenable.sc) Integration

This document describes the available tools for the Tenable Security Center (formerly Tenable.sc) integration within the SecOps SOAR MCP Server. Tenable.sc provides vulnerability management capabilities.

## Configuration

Ensure the Tenable Security Center integration is configured in the SOAR platform with the necessary API keys (Access Key, Secret Key) and the Tenable.sc host address.

## Available Tools

### tenable_security_center_get_report
- **Description:** Get the content of a vulnerability report from Tenable.sc by its ID or name.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `report_id` (str, optional): The ID number of the report (can be found in the report URL). Provide either `report_id` or `report_name`. Defaults to None.
    - `report_name` (str, optional): The name of the report as shown in the GUI. Provide either `report_id` or `report_name`. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the report content.

### tenable_security_center_get_related_assets
- **Description:** Get assets from a specified repository that are related to an IP address entity.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `repository_name` (str, required): The name of the repository to search within.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the related assets found.

### tenable_security_center_get_scan_results
- **Description:** Wait for a scan initiated by Tenable.sc to complete and retrieve its results using the scan result ID.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `scan_result_id` (str, required): The ID of the scan result to retrieve.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the scan results.

### tenable_security_center_get_vulnerabilities_for_ip
- **Description:** Get vulnerabilities and a severity summary for a specific IP address entity from Tenable.sc.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing vulnerability details and severity summary for the IP.

### tenable_security_center_create_ip_list_asset
- **Description:** Create a new static IP list asset in Tenable.sc using IP address entities. Requires at least one IP entity.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `name` (str, required): Specify the name for the new IP list asset.
    - `description` (str, optional): Specify a description for the asset. Defaults to None.
    - `tag` (str, optional): Specify a tag for the asset. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Addresses for the list. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the asset creation.

### tenable_security_center_enrich_ip
- **Description:** Get information about IP addresses from a specified repository in Tenable.sc and enrich the corresponding entities.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `repository_name` (str, required): The name of the repository to query.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Address(es). Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the enrichment information for the IP addresses.

### tenable_security_center_ping
- **Description:** Test connectivity to the Tenable Security Center instance configured in the SOAR platform.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### tenable_security_center_run_asset_scan
- **Description:** Initiate a vulnerability scan in Tenable.sc targeting a specific asset list, using a specified policy and repository.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `scan_name` (str, required): Specify the name for the new scan job.
    - `asset_name` (str, required): Specify the name of the asset list to scan.
    - `policy_id` (str, required): Specify the ID of the scan policy to use.
    - `repository_id` (str, required): Specify the ID of the repository to store results in.
    - `description` (str, optional): Specify a description for the scan job. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the scan initiation, likely including a scan or result ID.

### tenable_security_center_scan_ips
- **Description:** Initiate a vulnerability scan in Tenable.sc targeting specific IP address entities using a named policy.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `scan_name` (str, required): The name for the new scan job.
    - `policy_name` (str, required): The name of the scan policy to use.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Addresses to scan. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the scan initiation, likely including a scan or result ID.

### tenable_security_center_add_ip_to_ip_list_asset
- **Description:** Add IP address entities to an existing static IP list asset in Tenable.sc.
- **Supported Entities:** IP Address
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `asset_name` (str, required): Specify the name of the existing IP list asset to modify.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the IP Addresses to add. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the update operation.
