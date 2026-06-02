# Site24x7 SOAR Integration

## Overview

This integration provides tools to interact with Site24x7 within the Chronicle SOAR platform. It allows testing connectivity and generating refresh tokens required for configuration.

## Tools

### `site24x7_ping`

Test connectivity to the Site24x7 with parameters provided at the integration configuration page on the Marketplace tab.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `site24x7_generate_refresh_token`

Generate a refresh token needed for Integration configuration. Please refer to the documentation portal for more details.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `authorization_code` (str, required): Specify the authorization code.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
