# VMRay Analyzer Integration

The VMRay Analyzer integration for Chronicle SOAR allows interaction with the VMRay malware analysis and sandbox platform. This enables submitting samples (files, URLs) for deep analysis and retrieving detailed reports within SOAR workflows.

## Overview

VMRay Analyzer provides advanced, evasion-resistant malware analysis technology. It detonates suspicious files and URLs in a controlled environment to observe their behavior, identify threats, and extract indicators of compromise (IOCs).

This integration typically allows Chronicle SOAR to:

*   **Submit Samples:** Send files or URLs directly from SOAR cases or alerts to VMRay for analysis.
*   **Retrieve Analysis Reports:** Fetch comprehensive reports detailing the sample's behavior, classification (malicious, suspicious, benign), extracted IOCs, screenshots, and potentially network traffic (PCAPs).
*   **Check Sample Status:** Query the status of ongoing analyses.
*   **Get IOCs:** Extract IOCs associated with a specific analysis report.

## Key Actions

The following actions are available through the VMRay Analyzer integration:

*   **Scan Hash (`vm_ray_scan_hash`)**
    *   Description: Get details about a specific hash (FileHash entity) from VMRay, including IOCs and threat indicators.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `threat_indicator_score_threshold` (string, required): Lowest score (max 5) for returned threat indicators.
        *   `ioc_type_filter` (string, required): Comma-separated list of IOC types to return (e.g., `domains,emails,files,ips,mutexes,processes,registry,urls`).
        *   `ioc_verdict_filter` (string, required): Comma-separated list of IOC verdicts to filter by (e.g., `Malicious,Suspicious,Clean,None`).
        *   `max_io_cs_to_return` (string, optional, default=10): Max IOCs per entity per type.
        *   `max_threat_indicators_to_return` (string, optional, default=10): Max threat indicators per entity.
        *   `create_insight` (bool, optional): Create an insight with entity information.
        *   `only_suspicious_insight` (bool, optional): Only create insight for suspicious entities (requires `create_insight`).
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities to scan.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Upload File And Get Report (`vm_ray_upload_file_and_get_report`)**
    *   Description: Submit files (by path on the SOAR server) for analysis in VMRay and retrieve the report. Runs asynchronously.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `sample_file_path` (string, required): Comma-separated list of absolute file paths for submission.
        *   `tag_names` (string, optional): Tags to add to the submission.
        *   `comment` (string, optional): Comment to add to the submission.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Add Tag to Submission (`vm_ray_add_tag_to_submission`)**
    *   Description: Add a tag to an existing VMRay submission using its ID.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `submission_id` (string, required): The ID of the VMRay submission.
        *   `tag_name` (string, required): The tag name to add.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`vm_ray_ping`)**
    *   Description: Test connectivity to the VMRay API.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Scan URL (`vm_ray_scan_url`)**
    *   Description: Submit a URL entity for analysis and receive related information, including IOCs and threat indicators.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `threat_indicator_score_threshold` (string, required): Lowest score (max 5) for returned threat indicators.
        *   `ioc_type_filter` (string, required): Comma-separated list of IOC types to return (e.g., `ips,urls,domains`).
        *   `ioc_verdict_filter` (string, required): Comma-separated list of IOC verdicts to filter by (e.g., `Malicious,Suspicious,Clean,None`).
        *   `max_io_cs_to_return` (string, optional, default=10): Max IOCs per entity per type.
        *   `max_threat_indicators_to_return` (string, optional, default=10): Max threat indicators per entity.
        *   `create_insight` (bool, optional): Create an insight with entity information.
        *   `only_suspicious_insight` (bool, optional): Only create insight for suspicious entities (requires `create_insight`).
        *   `tag_names` (string, optional): Tags to add to the submission.
        *   `comment` (string, optional): Comment to add to the submission.
        *   `target_entities` (List[TargetEntity], optional): Specific URL entities to scan.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

## Use Cases

*   **Automated Malware Detonation:** Automatically submit suspicious email attachments or downloaded files to VMRay as part of an incident response playbook.
*   **URL Sandboxing:** Analyze suspicious URLs found in phishing emails or web logs.
*   **Threat Enrichment:** Enrich file hash and URL entities in SOAR with VMRay analysis results, verdicts, and IOCs.
*   **Deep Dive Analysis:** Provide analysts with detailed behavioral reports from VMRay directly within the SOAR case context.

## Configuration

*(Details on configuring the integration, including the VMRay Analyzer API endpoint URL, API key, and any specific SOAR platform settings, should be added here.)*
