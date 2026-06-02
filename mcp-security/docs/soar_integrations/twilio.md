# Twilio Integration

This document describes the available tools for the Twilio integration within the SecOps SOAR MCP Server. Twilio provides communication APIs for SMS, voice, video, and more. This integration focuses on SMS capabilities.

## Configuration

Ensure the Twilio integration is configured in the SOAR platform with your Twilio Account SID, Auth Token, and the Twilio phone number to send messages from.

## Available Tools

### twilio_ping
- **Description:** Test connectivity to the Twilio service using the configured credentials.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### twilio_send_sms_and_wait
- **Description:** Send an SMS message to a specified phone number and wait for a reply containing a unique identifier. The message includes a generated `SiemplifyID: <code>`. The action waits for a response containing the same code.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `phone_number` (str, required): Target phone number, including the country dial code (e.g., +15551234567).
    - `message` (str, required): The content of the SMS message to send.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result, including the response received if successful.

### twilio_send_sms
- **Description:** Send an SMS message to a specified phone number.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `phone_number` (str, required): Target phone number, including the country dial code (e.g., +15551234567).
    - `message` (str, required): The content of the SMS message to send.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the SMS sending attempt.
