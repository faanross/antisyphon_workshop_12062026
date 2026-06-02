# RiskIQ PassiveTotal Integration

The RiskIQ PassiveTotal integration for Chronicle SOAR allows interaction with the PassiveTotal threat analysis platform (now part of Microsoft). This enables enriching incidents with passive DNS, WHOIS, and reputation data for domains, IPs, and hosts.

## Overview

RiskIQ PassiveTotal aggregates data from various sources, including passive DNS, WHOIS records, SSL certificates, web trackers, and malware intelligence, to provide comprehensive context around internet infrastructure. It helps analysts investigate threats, map attacker infrastructure, and understand relationships between indicators.

This integration typically enables Chronicle SOAR to:

*   **Query WHOIS Data:** Retrieve current and historical WHOIS registration information for domains and IPs.
*   **Query Passive DNS:** Find historical DNS resolutions for domains or IPs.
*   **Get Reputation:** Retrieve reputation scores and classifications for IPs and hosts/domains.
*   **Enrich Indicators:** Gather comprehensive context for domains, IPs, and potentially other indicators like SSL certificates or web components.

## Key Actions

The following actions are available through the RiskIQ PassiveTotal integration:

*   **Whois Scan Domain (`passive_total_who_is_scan_domain`)**
    *   Description: Perform a WHOIS query for a domain entity using PassiveTotal data.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific Domain/Hostname entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`passive_total_ping`)**
    *   Description: Test connectivity to the PassiveTotal API.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Whois Address Reputation (`passive_total_who_is_address_reputation`)**
    *   Description: Request IP address reputation information from PassiveTotal.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific IP Address entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Whois Scan Address (`passive_total_who_is_scan_address`)**
    *   Description: Perform a WHOIS query for an IP address entity using PassiveTotal data.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific IP Address entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Whois Host Reputation (`passive_total_whois_host_reputation`)**
    *   Description: Request host/domain reputation information from PassiveTotal.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific Domain/Hostname entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Indicator Enrichment:** Automatically enrich IP, Domain, and Hostname entities with WHOIS data, passive DNS resolutions, and reputation scores from PassiveTotal.
*   **Infrastructure Mapping:** Identify related domains or IPs based on shared WHOIS records or passive DNS history.
*   **Phishing Investigation:** Analyze the registration history and reputation of suspicious domains and IPs found in phishing campaigns.
*   **Threat Hunting:** Pivot investigations based on data points retrieved from PassiveTotal, such as finding other domains hosted on the same IP or registered by the same entity.

## Configuration

*(Details on configuring the integration, including the PassiveTotal API endpoint URL, API User email, and API Key, along with any specific SOAR platform settings, should be added here.)*
