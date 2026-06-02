# VMRay Analyzer Integration

This document describes the available tools for the VMRay Analyzer integration within the SecOps SOAR MCP Server. VMRay provides advanced malware analysis and sandboxing capabilities.

## Configuration

Ensure the VMRay integration is configured in the SOAR platform with the necessary API key and VMRay server URL.

## Available Tools

### vm_ray_scan_hash
- **Description:** Get analysis details, threat indicators, and IOCs for a specific file hash from VMRay.
- **Supported Entities:** Filehash (MD5, SHA1, SHA256)
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `threat_indicator_score_threshold` (str, required): Specify the lowest threat score (max 5) to include threat indicators.
    - `ioc_type_filter` (str, required): Comma-separated list of IOC types to return (e.g., "domains,ips,urls,files").
    - `ioc_verdict_filter` (str, required): Comma-separated list of IOC verdicts to include (e.g., "Malicious,Suspicious").
    - `max_io_cs_to_return` (str, optional): Max IOCs per type per entity (Default: 10). Defaults to None.
    - `max_threat_indicators_to_return` (str, optional): Max threat indicators per entity (Default: 10). Defaults to None.
    - `create_insight` (bool, optional): If enabled, create an insight with the results. Defaults to None.
    - `only_suspicious_insight` (bool, optional): If enabled (and `create_insight` is enabled), only create insights for suspicious entities. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the Filehash. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the analysis results, IOCs, and threat indicators for the hash.

### vm_ray_upload_file_and_get_report
- **Description:** Submit local files for analysis to VMRay and retrieve the report. This action runs asynchronously.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `sample_file_path` (str, required): Comma-separated list of absolute paths on the SOAR server filesystem for the files to submit.
    - `tag_names` (str, optional): Comma-separated tags to add to the submission. Defaults to None.
    - `comment` (str, optional): Comment to add to the submission. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the submission initiation and potentially the analysis report once completed.

### vm_ray_add_tag_to_submission
- **Description:** Add a tag to an existing VMRay submission using its ID.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `submission_id` (str, required): The ID of the VMRay submission.
    - `tag_name` (str, required): The tag name to add.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the tag addition operation.

### vm_ray_ping
- **Description:** Test connectivity to the VMRay instance configured in the SOAR platform.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### vm_ray_scan_url
- **Description:** Submit a URL for analysis to VMRay and retrieve related information, including IOCs and threat indicators.
- **Supported Entities:** URL
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `threat_indicator_score_threshold` (str, required): Specify the lowest threat score (max 5) to include threat indicators.
    - `ioc_type_filter` (str, required): Comma-separated list of IOC types to return (e.g., "ips,urls,domains").
    - `ioc_verdict_filter` (str, required): Comma-separated list of IOC verdicts to include (e.g., "Malicious,Suspicious").
    - `max_io_cs_to_return` (str, optional): Max IOCs per type per entity (Default: 10). Defaults to None.
    - `max_threat_indicators_to_return` (str, optional): Max threat indicators per entity (Default: 10). Defaults to None.
    - `create_insight` (bool, optional): If enabled, create an insight with the results. Defaults to None.
    - `only_suspicious_insight` (bool, optional): If enabled (and `create_insight` is enabled), only create insights for suspicious entities. Defaults to None.
    - `tag_names` (str, optional): Comma-separated tags to add to the submission. Defaults to None.
    - `comment` (str, optional): Comment to add to the submission. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Should contain the URL. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the analysis results, IOCs, and threat indicators for the URL.
