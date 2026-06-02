# ProtectWise Integration

The ProtectWise integration for Chronicle SOAR allows interaction with the ProtectWise Grid platform, enabling retrieval of network event data and packet captures (PCAPs) associated with specific entities or timeframes.

## Overview

ProtectWise (now part of Verizon) offered a cloud-delivered network detection and response (NDR) platform that captured and analyzed full packet data, providing retrospective analysis capabilities.

This integration typically enables Chronicle SOAR to:

*   **Retrieve Network Events:** Query for network events associated with specific indicators (IP addresses, domains, etc.) within a given timeframe.
*   **Download PCAPs:** Retrieve the full packet capture associated with specific network events or flows for deep-dive analysis.

## Key Actions

The following actions are available through the ProtectWise integration:

*   **Get Events (`protectwise_get_events`)**
    *   Description: Get all network events associated with an entity (e.g., IP Address, Domain) within a given timeframe.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `timeframe_hours` (string, required): Timeframe in hours to fetch events for (e.g., `1`).
        *   `target_entities` (List[TargetEntity], optional): Specific entities (IP Address, Domain, etc.) to query events for.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Ping (`protectwise_ping`)**
    *   Description: Test connectivity to the ProtectWise API.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get Pcap (`protectwise_get_pcap`)**
    *   Description: Download the packet capture (PCAP) associated with a specific ProtectWise event (likely identified via an event ID passed as an entity).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific entity representing the event for which to download the PCAP (e.g., an entity containing the ProtectWise Event ID).
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Network Forensics:** Retrieve network events associated with a compromised host's IP address during an incident investigation.
*   **Deep Packet Analysis:** Download the PCAP for a suspicious network connection identified in an alert for detailed analysis in tools like Wireshark.
*   **Threat Hunting:** Query ProtectWise for network activity related to known malicious IPs or domains across historical data.

## Configuration

*(Details on configuring the integration, including the ProtectWise API endpoint URL, API credentials (e.g., API key or username/password), and any specific SOAR platform settings, should be added here.)*
