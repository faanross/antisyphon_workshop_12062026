# Phishing Initiative Integration

The Phishing Initiative integration for Chronicle SOAR allows interaction with the Phishing Initiative project, a French initiative aimed at combating phishing websites. This integration enables checking URLs against their database and potentially submitting new phishing URLs.

## Overview

Phishing Initiative (phishing-initiative.fr / phishing-initiative.com) is a project, primarily focused on France, that allows users to report phishing URLs. These reported URLs are analyzed, and confirmed phishing sites are added to blocklists used by browsers and security solutions.

This integration likely facilitates:

*   **URL Reputation Check:** Query the Phishing Initiative database to determine if a URL is known to be associated with phishing.
*   **URL Submission:** Report potentially malicious URLs discovered during investigations to the Phishing Initiative for analysis and potential blocking.

## Key Actions

The following actions are available through the Phishing Initiative integration:

*   **Ping (`phishing_initiative_ping`)**
    *   Description: Test connectivity to the Phishing Initiative service.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get URL Status (`phishing_initiative_get_url_status`)**
    *   Description: Get the status of a URL entity from the Phishing Initiative database.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities (Identifier, EntityType). Typically URL.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

## Use Cases

*   **Phishing Email Analysis:** Automatically check URLs found in suspected phishing emails against the Phishing Initiative database as part of an automated triage playbook using the `Get URL Status` action.
*   **Threat Intelligence Enrichment:** Enrich URL entities within SOAR cases with reputation information (known phish/unknown) from Phishing Initiative.
*   **Indicator Validation:** Use Phishing Initiative as one source among others to assess the maliciousness of a URL found in logs or alerts.

## Configuration

*(Details on configuring the integration, such as any required API keys, service URLs, or specific settings within the SOAR platform, should be added here. Note that Phishing Initiative might have specific requirements or limitations for API access.)*
