# Proofpoint TAP Integration

The Proofpoint Targeted Attack Protection (TAP) integration for Chronicle SOAR allows security teams to leverage TAP's advanced threat detection and forensic capabilities within their SOAR workflows. This typically involves querying TAP for details about malicious URLs, attachments, and user clicks.

## Overview

Proofpoint TAP provides protection against advanced email threats that evade traditional security layers. Key features include URL rewriting and time-of-click analysis, attachment sandboxing, and identification of Very Attacked People™ (VAPs). TAP generates detailed forensic information about threats and user interactions with them.

This integration enables Chronicle SOAR to:

*   **Retrieve Click Forensics:** Get detailed information about user clicks on TAP-rewritten URLs, including whether the destination was malicious at the time of the click, user details, and threat information.
*   **Get Message Details:** Fetch TAP-specific threat details associated with a particular message (e.g., identified threats, attachment verdicts).
*   **Query Threat Data:** Look up indicators (like URLs or attachment hashes) within TAP's threat intelligence.
*   **Identify VAPs:** Retrieve the list of users identified by Proofpoint as Very Attacked People™.

## Key Actions

The following actions are available through the Proofpoint TAP integration:

*   **Get Campaign (`proof_point_tap_get_campaign`)**
    *   Description: Return information about specific campaigns identified by Proofpoint TAP, optionally including forensic details.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `campaign_id` (string, required): Specify a comma-separated list of campaign IDs.
        *   `create_insight` (bool, optional): If enabled, create an insight containing campaign information.
        *   `create_threat_campaign_entity` (bool, optional): If enabled, create a threat campaign entity from enriched campaigns.
        *   `fetch_forensics_info` (bool, optional): If enabled, return forensics information about the campaigns.
        *   `forensic_evidence_type_filter` (string, optional): Comma-separated list of evidence types to return when fetching forensics (e.g., `attachment,url,dns`). Possible values: `attachment`, `cookie`, `dns`, `dropper`, `file`, `ids`, `mutex`, `network`, `process`, `registry`, `screenshot`, `url`, `redirect_chain`, `behavior`.
        *   `max_forensics_evidence_to_return` (string, optional): Max evidence items per campaign (Default: 50, Max: 1000).
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Decode URL (`proof_point_tap_decode_url`)**
    *   Description: Decode Proofpoint TAP encoded URLs (typically found in emails). Supports URL entities in scope and/or a comma-separated list.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `encoded_ur_ls` (string, optional): Comma-separated list of encoded URLs to decode.
        *   `create_url_entities` (bool, optional): If enabled, create URL entities for successfully decoded URLs.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities (typically URL).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (URL entities in scope will be processed).

*   **Ping (`proof_point_tap_ping`)**
    *   Description: Test connectivity to the Proofpoint TAP API using configured credentials.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Phishing Investigation Enrichment:** When investigating a phishing alert involving a clicked URL, query TAP using `Get URL Forensics` to understand the threat details and user interaction at the time of the click.
*   **Compromised Credential Alerting:** If TAP forensics show a user clicked on a credential phishing link, trigger a SOAR playbook to initiate password reset procedures (potentially using an IAM integration like PingIdentity or Azure AD).
*   **Targeted Threat Monitoring:** Regularly query TAP for clicks associated with known malicious campaigns or check if any VAPs have clicked on suspicious links.
*   **Malware Analysis:** Retrieve TAP's verdict and analysis details for suspicious attachments using `Get Attachment Forensics`.

## Configuration

*(Details on configuring the integration, including obtaining Proofpoint TAP API credentials (Service Principal and Secret), specifying the TAP API endpoint URL, and configuring settings within the SOAR platform, should be added here.)*
