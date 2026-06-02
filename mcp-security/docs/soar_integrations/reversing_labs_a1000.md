# ReversingLabs A1000 Integration

The ReversingLabs A1000 integration for Chronicle SOAR allows interaction with the ReversingLabs A1000 Malware Analysis and Threat Hunting platform. This enables submitting files for analysis, retrieving reports, checking analysis status, and managing samples on the A1000 appliance.

## Overview

ReversingLabs A1000 is an on-premises appliance that provides static and dynamic file analysis, threat intelligence, and hunting capabilities. It helps organizations analyze malware, understand file reputation, and detect threats within their network.

This integration typically enables Chronicle SOAR to:

*   **Submit Files:** Upload files (by path) to the A1000 appliance for analysis.
*   **Retrieve Reports:** Get detailed analysis reports for files based on their hash (MD5, SHA1, SHA256).
*   **Check Status:** Query the processing status of submitted samples.
*   **Manage Samples:** Delete analyzed samples from the A1000 appliance.

## Key Actions

The following actions are available through the ReversingLabs A1000 integration:

*   **Get Report (`reversinglabs_a1000_get_report`)**
    *   Description: Get a summary classification report and details for a sample (FileHash entity).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities (MD5, SHA1, SHA256).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Delete Sample (`reversinglabs_a1000_delete_sample`)**
    *   Description: Delete samples (FileHash entities) and related data from the A1000 appliance.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities to delete.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`reversinglabs_a1000_ping`)**
    *   Description: Test connectivity to the ReversingLabs A1000 appliance API.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Upload File (`reversinglabs_a1000_upload_file`)**
    *   Description: Upload a file (from a specified path on the SOAR server/agent) for analysis on the A1000 appliance.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `file_path` (string, required): The full path to the file to upload.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Scan Status (`reversinglabs_a1000_get_scan_status`)**
    *   Description: Return the processing status on the A1000 appliance for samples identified by FileHash entities.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Malware Analysis:** Automatically upload suspicious files retrieved during an investigation to the A1000 and get the analysis report.
*   **File Reputation Check:** Enrich FileHash entities with classification and threat details from A1000 reports.
*   **Threat Hunting:** Query the A1000 for known indicators or check the status of previously submitted samples.
*   **Data Management:** Delete samples from the A1000 appliance after analysis is complete or no longer needed.

## Configuration

*(Details on configuring the integration, including the ReversingLabs A1000 appliance URL, API credentials (username/password), and any specific SOAR platform settings like SSL verification, should be added here.)*
