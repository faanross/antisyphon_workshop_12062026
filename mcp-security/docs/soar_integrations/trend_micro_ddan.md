# Trend Micro Deep Discovery Analyzer (DDAN) Integration

This document describes the available tools for the Trend Micro Deep Discovery Analyzer (DDAN) integration within the SecOps SOAR MCP Server. DDAN provides advanced threat analysis and sandboxing.

## Configuration

Ensure the Trend Micro DDAN integration is configured in the SOAR platform with the necessary API key and DDAN server address.

## Available Tools

### trend_micro_ddan_submit_file_url
- **Description:** Submit a file for analysis via a URL to Trend Micro DDAN. This action runs asynchronously.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `file_ur_ls` (str, required): Specify a comma-separated list of URLs pointing to the files to be analyzed.
    - `fetch_event_log` (bool, optional): If enabled, fetch event logs related to the files after analysis. Defaults to None.
    - `fetch_suspicious_objects` (bool, optional): If enabled, fetch suspicious objects related to the files after analysis. Defaults to None.
    - `fetch_sandbox_screenshot` (bool, optional): If enabled, attempt to fetch a sandbox screenshot related to the files after analysis. Defaults to None.
    - `resubmit_file` (bool, optional): If enabled, resubmit the file even if a previous submission exists. Defaults to None.
    - `max_event_logs_to_return` (str, optional): Max event logs to return (Default: 50, Max: 200). Defaults to None.
    - `max_suspicious_objects_to_return` (str, optional): Max suspicious objects to return (Default: 50, Max: 200). Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the submission initiation.

### trend_micro_ddan_ping
- **Description:** Test connectivity to the Trend Micro DDAN instance configured in the SOAR platform.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### trend_micro_ddan_submit_file
- **Description:** Submit local files for analysis to Trend Micro DDAN. This action runs asynchronously.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `file_paths` (str, required): Specify a comma-separated list of absolute paths on the SOAR server filesystem for the files to be analyzed.
    - `fetch_event_log` (bool, optional): If enabled, fetch event logs related to the files after analysis. Defaults to None.
    - `fetch_suspicious_objects` (bool, optional): If enabled, fetch suspicious objects related to the files after analysis. Defaults to None.
    - `fetch_sandbox_screenshot` (bool, optional): If enabled, attempt to fetch a sandbox screenshot related to the files after analysis. Defaults to None.
    - `resubmit_file` (bool, optional): If enabled, resubmit the file even if a previous submission exists. Defaults to None.
    - `max_event_logs_to_return` (str, optional): Max event logs to return (Default: 50, Max: 200). Defaults to None.
    - `max_suspicious_objects_to_return` (str, optional): Max suspicious objects to return (Default: 50, Max: 200). Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the submission initiation.
