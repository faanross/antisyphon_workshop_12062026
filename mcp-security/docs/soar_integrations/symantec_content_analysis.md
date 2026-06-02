# Symantec Content Analysis Integration

This document describes the available tools for the Symantec Content Analysis integration within the SecOps SOAR MCP Server. This integration allows interaction with the Symantec Content Analysis System (CAS) for file submission and analysis.

## Configuration

Ensure the Symantec Content Analysis integration is configured in the SOAR platform with the necessary API credentials, IP address/hostname, and instance details.

## Available Tools

### symantec_content_analysis_ping
- **Description:** Test connectivity to the Symantec Content Analysis instance configured in the SOAR platform.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### symantec_content_analysis_get_hash_report
- **Description:** Get analysis reports (samples) for a given file hash (MD5 or SHA256) from Symantec Content Analysis.
- **Supported Entities:** Filehash (MD5, SHA256)
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the Filehash. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the analysis report(s) for the specified hash.

### symantec_content_analysis_submit_file
- **Description:** Upload a file from a specified path to Symantec Content Analysis for scanning and analysis.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `file_path` (str, required): The path to the file on the SOAR server's filesystem to submit for analysis.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the file submission, likely including a task ID or initial status.
