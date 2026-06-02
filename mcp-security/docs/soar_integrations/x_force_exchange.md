# X-Force Exchange Integration

The IBM X-Force Exchange integration for Chronicle SOAR allows interaction with the X-Force Exchange threat intelligence platform. This enables enriching security incidents with threat data related to IP addresses, URLs, domains, file hashes, and vulnerabilities.

## Overview

IBM X-Force Exchange is a cloud-based threat intelligence platform that provides access to IBM's vast repository of security research, vulnerability information, and real-time threat data. It allows users to research indicators, understand threat actors, and consume machine-readable threat intelligence (MRTI).

This integration typically enables Chronicle SOAR to:

*   **Get Indicator Reputation:** Query the reputation and associated threat details for IP addresses, URLs, domains, and file hashes (MD5, SHA1, SHA256).
*   **Get Vulnerability Information:** Retrieve details about specific CVEs (Common Vulnerabilities and Exposures).
*   **Retrieve Collections/Reports:** Access threat activity reports or collections related to specific malware families, threat actors, or campaigns (if supported by the API).

## Key Actions

The following actions are available through the IBM X-Force Exchange (XForce) integration:

*   **Get Hash Info (`x_force_get_hash_info`)**
    *   Description: Query X-Force for information about a file hash (FileHash entity).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `threshold` (string, optional): Risk score threshold (e.g., `low`, `medium`, `high`). Marks entity suspicious if score exceeds threshold.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get IP Info (`x_force_get_ip_info`)**
    *   Description: Query X-Force for information about an IP address (IP Address entity).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `threshold` (string, optional): Risk score threshold (integer, e.g., `3`). Marks entity suspicious if score exceeds threshold.
        *   `target_entities` (List[TargetEntity], optional): Specific IP Address entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`x_force_ping`)**
    *   Description: Test connectivity to the X-Force Exchange API.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get URL Info (`x_force_get_url_info`)**
    *   Description: Query X-Force for information about a URL (URL entity).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `threshold` (string, optional): Risk score threshold (integer, e.g., `3`). Marks entity suspicious if score exceeds threshold.
        *   `target_entities` (List[TargetEntity], optional): Specific URL entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get IP By Category (`x_force_get_ip_by_category`)**
    *   Description: Retrieve IPs associated with a specific X-Force category. (Note: The description in the code is empty, functionality inferred from name and parameters).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `category` (string, required): The X-Force category to query for associated IPs.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get IP Malware (`x_force_get_ip_malware`)**
    *   Description: Query X-Force for malware families associated with an IP address (IP Address entity).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific IP Address entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Indicator Enrichment:** Automatically enrich IP, URL, domain, and file hash entities within SOAR cases with threat intelligence from X-Force Exchange, including risk scores, associated malware/campaigns, and geographical data.
*   **Vulnerability Prioritization:** Fetch details for CVEs identified by vulnerability scanners to understand their severity, exploitability, and associated threats reported by X-Force.
*   **Threat Context:** Retrieve reports or collections related to indicators found in alerts to gain a broader understanding of the associated threat actor or campaign.
*   **Phishing Investigation:** Check the reputation of URLs and domains found in suspected phishing emails.

## Configuration

*(Details on configuring the integration, including obtaining an X-Force Exchange API Key and Password, specifying the API endpoint URL, and configuring settings within the SOAR platform, should be added here.)*
