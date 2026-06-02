# Pub/Sub Integration

The Google Cloud Pub/Sub integration for Chronicle SOAR primarily facilitates the ingestion of messages from Pub/Sub topics into the SOAR platform, typically configured as a connector. It also provides a basic action to test connectivity.

## Overview

Google Cloud Pub/Sub is a globally distributed message bus that automatically scales as needed. It allows services to communicate asynchronously with latencies on the order of 100 milliseconds. Pub/Sub is often used as a messaging backbone for event ingestion pipelines, streaming analytics, and service integration.

This integration typically enables Chronicle SOAR to:

*   **Ingest Events (Connector):** Subscribe to a Pub/Sub topic and process incoming messages as potential SOAR alerts or events. This is the primary use case.
*   **Test Connectivity:** Verify the connection and authentication settings used to access Pub/Sub.

*Note: While Pub/Sub also supports publishing messages, this specific SOAR integration implementation (based on the available actions) appears focused on consumption and connectivity testing, not publishing.*

## Key Actions

The following action is available through the Google Cloud Pub/Sub integration:

*   **Ping (`pub_sub_ping`)**
    *   Description: Use the Ping action to test the connectivity to Pub/Sub using the configured credentials (likely a service account key).
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Event Ingestion:** Configure the Pub/Sub connector in Chronicle SOAR to subscribe to topics receiving security-relevant events from Google Cloud services (like Security Command Center findings, Cloud Logging alerts) or custom applications, turning these messages into SOAR alerts.
*   **Connectivity Verification:** Use the `Ping` action to ensure the SOAR platform can successfully authenticate and connect to the configured Pub/Sub project and topic.

## Configuration

*(Details on configuring the integration, particularly for the connector functionality, including the Google Cloud Project ID, Pub/Sub Topic name, Subscription name, and Service Account credentials (JSON key file) with appropriate Pub/Sub Subscriber permissions, should be added here.)*
