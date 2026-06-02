# Splash SOAR Integration

## Overview

This integration provides tools for interacting with Splash (a service likely used for web page rendering and analysis) from within the Chronicle SOAR platform. It allows testing connectivity and enriching URL or IP address entities with information like screenshots, history, and HAR data.

## Tools

### `splash_ping`

Test connectivity to the Splash with parameters provided at the integration configuration page on the Marketplace tab.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `splash_enrich_entities`

Enrich entities using information from Splash. Supported entities: URL, IP Address. Note: URLs need to have a schema. For IP addresses, action will add the “HTTPS” schema.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `create_insight` (Optional[bool], optional, default=None): If enabled, action will create an insight containing all of the retrieved information about the entity.
*   `include_png_screenshot` (Optional[bool], optional, default=None): If enabled, action will return a PNG screenshot in an insight. Note: “Create Insight” should be enabled for this parameter to work.
*   `include_history` (Optional[bool], optional, default=None): If enabled, action will return history information.
*   `include_har` (Optional[bool], optional, default=None): If enabled, action will return HAR information.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
