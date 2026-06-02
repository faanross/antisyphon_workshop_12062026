# Palo Alto WildFire Integration

The Palo Alto Networks WildFire integration for Chronicle SOAR enables interaction with the WildFire cloud-based malware analysis service. This allows security teams to submit files or URLs for analysis, retrieve reports, and leverage WildFire's threat intelligence within their SOAR workflows.

## Overview

Palo Alto Networks WildFire is a cloud-based threat analysis service that identifies unknown malware, zero-day exploits, and advanced persistent threats (APTs) by executing suspicious files and URLs in a virtual sandbox environment.

This integration typically provides capabilities to:

*   **Submit Files/URLs:** Send suspicious files or URLs directly from SOAR cases or alerts to WildFire for analysis.
*   **Get Reports:** Retrieve analysis reports for submitted files or URLs, or query for existing reports based on hashes or URLs. Reports often include verdicts (e.g., malware, grayware, benign), behavioral analysis details, and associated indicators.
*   **Check Verdicts:** Quickly check the WildFire verdict for a file hash or URL without retrieving the full report.

## Key Actions

The following actions are available through the Palo Alto WildFire integration:

*   **Get Report (`wildfire_get_report`)**
    *   Description: Get a detonation report from WildFire for entities (Filehash, URL) within the scope.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities (Identifier, EntityType) to run the action on. Typically Filehash or URL.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Detonate File (`wildfire_detonate_file`)**
    *   Description: Upload a file (specified by path on the SOAR server) to WildFire for analysis and retrieve the report.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `file_paths` (string, required): Path(s) to the file(s) on the SOAR server to be uploaded and detonated.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`wildfire_ping`)**
    *   Description: Test connectivity to Wildfire using the configured API key and endpoint.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Pcap (`wildfire_get_pcap`)**
    *   Description: Download and save the PCAP file (network capture) associated with a sample analysis from WildFire for entities (Filehash) within the scope.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities (Identifier, EntityType). Typically Filehash.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Get File (`wildfire_get_file`)**
    *   Description: Download and save the original sample file from WildFire for entities (Filehash) within the scope. **Use with caution, as this downloads potentially malicious files.**
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities (Identifier, EntityType). Typically Filehash.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

## Use Cases

*   **Malware Analysis:** Automatically submit suspicious email attachments or downloaded files discovered during an investigation to WildFire.
*   **URL Reputation Check:** Submit suspicious URLs found in phishing emails or logs to WildFire for analysis.
*   **Indicator Enrichment:** Enrich SOAR entities (file hashes, URLs) with WildFire verdicts and report details.
*   **Automated Detonation:** Integrate WildFire analysis into automated phishing response or malware investigation playbooks.

## Configuration

*(Details on configuring the integration, including obtaining a WildFire API key, specifying the API endpoint, and configuring settings within the SOAR platform, should be added here.)*
