# ReversingLabs Titanium Integration

The ReversingLabs TitaniumCloud integration for Chronicle SOAR allows interaction with the ReversingLabs TitaniumCloud file reputation and threat intelligence service. This enables enriching file hash entities with detailed malware analysis information.

## Overview

ReversingLabs TitaniumCloud is a cloud-based service offering comprehensive file reputation and threat intelligence. It provides static analysis results, classification (malicious, suspicious, known good, unknown), threat names, and detailed metadata for a vast collection of file samples.

This integration typically enables Chronicle SOAR to:

*   **Enrich File Hashes:** Query TitaniumCloud using a file hash (MD5, SHA1, SHA256) to retrieve its classification, threat name (if malicious), risk score, and other available metadata.
*   **Test Connectivity:** Verify the connection to the TitaniumCloud API.

## Key Actions

The following actions are available through the ReversingLabs TitaniumCloud (ReversinglabsTitanium) integration:

*   **Ping (`reversinglabs_titanium_ping`)**
    *   Description: Test connectivity to the ReversingLabs TitaniumCloud API.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Malware Details (`reversinglabs_titanium_get_malware_details`)**
    *   Description: Query ReversingLabs TitaniumCloud for hash information (FileHash entity).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities (MD5, SHA1, SHA256).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **File Reputation Check:** Quickly determine the reputation (malicious, suspicious, known, unknown) of file hashes encountered during investigations.
*   **Malware Identification:** Identify the specific threat name or malware family associated with a malicious file hash.
*   **Indicator Enrichment:** Enrich FileHash entities in SOAR cases with detailed threat intelligence from TitaniumCloud.
*   **Automated Triage:** Use the TitaniumCloud classification in playbooks to help automate the triage of alerts involving file hashes.

## Configuration

*(Details on configuring the integration, including the ReversingLabs TitaniumCloud API endpoint URL, API credentials (username/password or token), and any specific SOAR platform settings, should be added here.)*
