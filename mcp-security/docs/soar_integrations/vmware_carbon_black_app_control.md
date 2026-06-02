# VMware Carbon Black App Control Integration

The VMware Carbon Black App Control (formerly CB Protection) integration for Chronicle SOAR allows interaction with the App Control platform, focusing on application whitelisting, file integrity monitoring, and device control.

## Overview

VMware Carbon Black App Control is a security solution designed to lock down servers and critical systems by preventing unwanted changes. It uses application whitelisting to ensure only trusted and approved software can execute, blocks unauthorized changes, and provides visibility into file activity.

This integration typically enables Chronicle SOAR to:

*   **Manage File Approvals/Bans:** Approve or ban specific files (based on hash) within App Control policies.
*   **Query File Status:** Check the approval status (approved, banned, unapproved) of a file hash.
*   **Manage Policies:** Potentially switch endpoints between different enforcement levels or policies (e.g., move a machine to a more restrictive policy).
*   **Retrieve Endpoint Information:** Get details about endpoints managed by App Control, including their current policy and status.

## Key Actions

The following actions are available through the VMware Carbon Black App Control (CBProtection) integration:

*   **Find File (`cb_protection_find_file`)**
    *   Description: Find instances of a file (based on FileHash entity) on multiple computers managed by App Control.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities to search for.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Unblock Hash (`cb_protection_unblock_hash`)**
    *   Description: Unblock a file hash (FileHash entity), removing it from the ban list either globally or for specific policies.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `policy_names` (string, optional): Comma-separated list of policy names to unblock the hash in (e.g., `Default Policy,Local Approval Policy`). If empty, unblocks globally.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities to unblock.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Analyze File (`cb_protection_analyze_file`)**
    *   Description: Submit a file (FileHash entity) for analysis using a configured connector (e.g., Palo Alto WildFire).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `connector_name` (string, required): The name of the analyzing connector configured in App Control (e.g., `Palo Alto Networks`).
        *   `priority` (string, required): Priority of the analysis (-2 to 2).
        *   `timeout` (string, required): Wait timeout in seconds (e.g., `120`).
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities to analyze.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Get Computers By File (`cb_protection_get_computers_by_file`)**
    *   Description: Get the computers on which a file with the given SHA-256 hash (FileHash entity) exists.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities (must be SHA-256).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Ping (`cb_protection_ping`)**
    *   Description: Test connectivity to the Carbon Black App Control server.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get System Info (`cb_protection_get_system_info`)**
    *   Description: Get information about a computer (Hostname or IP Address entity) managed by App Control.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific Hostname or IP Address entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Block Hash (`cb_protection_block_hash`)**
    *   Description: Block a file hash (FileHash entity) either globally or in specific policies.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `policy_names` (string, optional): Comma-separated list of policy names to block the hash in (e.g., `Default Policy`). If empty, blocks globally.
        *   `target_entities` (List[TargetEntity], optional): Specific FileHash entities to block.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Change Computer Policy (`cb_protection_change_computer_policy`)**
    *   Description: Move a computer (Hostname or IP Address entity) to a new App Control policy.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `policy_name` (string, required): The name of the target policy (e.g., `Default Policy`).
        *   `target_entities` (List[TargetEntity], optional): Specific Hostname or IP Address entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

## Use Cases

*   **Malware Containment:** If malware is detected on an endpoint (via EDR or SIEM), use the integration to ban the malware's hash in App Control across all managed systems.
*   **Software Approval Workflows:** Integrate App Control actions into software deployment workflows managed by SOAR, automatically approving necessary files.
*   **Incident Response:** Check the approval status of suspicious files found during an investigation. If an unapproved or banned file executed, investigate how policy enforcement failed or was bypassed. Move potentially compromised endpoints to a stricter policy mode.
*   **System Hardening:** Ensure critical servers remain in high-enforcement mode within App Control.

## Configuration

*(Details on configuring the integration, including the App Control server URL, API credentials (API token or username/password), and any specific SOAR platform settings, should be added here.)*
