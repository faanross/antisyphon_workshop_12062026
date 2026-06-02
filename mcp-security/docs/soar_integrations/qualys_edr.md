# Qualys EDR Integration

The Qualys Endpoint Detection and Response (EDR) integration for Chronicle SOAR primarily facilitates the ingestion of EDR alerts and events from the Qualys platform into SOAR. It also provides a basic action to test connectivity.

## Overview

Qualys EDR provides visibility into endpoint activity, detects suspicious behavior, and enables response actions. It leverages the Qualys Cloud Agent to collect telemetry and identify threats like malware, exploits, and anomalous activity.

This integration typically enables Chronicle SOAR to:

*   **Ingest Alerts/Events (Connector):** Configure a connector to pull EDR alerts, incidents, or specific event types from Qualys into Chronicle SOAR for centralized triage and investigation. This is the primary use case.
*   **Test Connectivity:** Verify the connection and authentication settings used to access the Qualys API.

*Note: Based on the available actions, this integration seems focused on data ingestion and connectivity testing. Direct response actions (like quarantining hosts or killing processes) might be handled through other Qualys integrations (like Qualys VM for patching) or different EDR platforms.*

## Key Actions

The following action is available through the Qualys EDR integration:

*   **Ping (`qualys_edr_ping`)**
    *   Description: Test connectivity to the Qualys EDR API using the configured credentials.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Alert Ingestion:** Configure the Qualys EDR connector to pull threat alerts into Chronicle SOAR, allowing analysts to manage and investigate these alongside alerts from other sources.
*   **Contextual Enrichment:** Use the data ingested from Qualys EDR (via the connector) to enrich SOAR cases involving specific endpoints or users.
*   **Connectivity Verification:** Use the `Ping` action to ensure the SOAR platform can successfully authenticate and connect to the Qualys API endpoint.

## Configuration

*(Details on configuring the integration, particularly for the connector functionality, including the Qualys API server URL, authentication credentials (username/password), and specific settings for event/alert polling within the SOAR platform, should be added here.)*
