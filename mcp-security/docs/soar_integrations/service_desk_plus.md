# ServiceDesk Plus SOAR Integration

This document details the tools provided by the ServiceDesk Plus SOAR integration.

## Overview

ServiceDesk Plus is an IT help desk software. This integration allows Chronicle SOAR to interact with ServiceDesk Plus to create, update, and manage requests (tickets) as part of automated security workflows.

## Tools

### `service_desk_plus_create_request`

Create a new request

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `subject` (str, required): The subject of the request.
*   `requester` (Optional[str], optional, default=None): The requester of the request. If not specified, set to the user of the API key.
*   `description` (Optional[str], optional, default=None): The description of the request.
*   `status` (Optional[str], optional, default=None): The status of the request.
*   `technician` (Optional[str], optional, default=None): The name of the technician assigned to the request.
*   `priority` (Optional[str], optional, default=None): The priority of the request.
*   `urgency` (Optional[str], optional, default=None): The urgency of the request.
*   `category` (Optional[str], optional, default=None): The category of the request.
*   `request_template` (Optional[str], optional, default=None): The template of the request.
*   `request_type` (Optional[str], optional, default=None): The type of the request. I.e: Incident, Service Request, etc.
*   `due_by_time_ms` (Optional[str], optional, default=None): The due date of the request in milliseconds.
*   `mode` (Optional[str], optional, default=None): The mode of the request.
*   `level` (Optional[str], optional, default=None): The level of the request.
*   `site` (Optional[str], optional, default=None): The site of the request.
*   `group` (Optional[str], optional, default=None): The group of the request.
*   `impact` (Optional[str], optional, default=None): The impact of the request.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_create_alert_request`

Create an request related to a Siemplify alert

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `subject` (str, required): The subject of the request.
*   `requester` (Optional[str], optional, default=None): The requester of the request. If not specified, set to the user of the API key.
*   `status` (Optional[str], optional, default=None): The status of the request.
*   `technician` (Optional[str], optional, default=None): The name of the technician assigned to the request.
*   `priority` (Optional[str], optional, default=None): The priority of the request.
*   `urgency` (Optional[str], optional, default=None): The urgency of the request.
*   `category` (Optional[str], optional, default=None): The category of the request.
*   `request_template` (Optional[str], optional, default=None): The template of the request.
*   `request_type` (Optional[str], optional, default=None): The type of the request. I.e: Incident, Service Request, etc.
*   `due_by_time_ms` (Optional[str], optional, default=None): The due date of the request in milliseconds.
*   `mode` (Optional[str], optional, default=None): The mode of the request.
*   `level` (Optional[str], optional, default=None): The level of the request.
*   `site` (Optional[str], optional, default=None): The site of the request.
*   `group` (Optional[str], optional, default=None): The group of the request.
*   `impact` (Optional[str], optional, default=None): The impact of the request.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_add_note_and_wait_for_reply`

Add a note and wait for new notes to be added to the given request.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `request_id` (str, required): The requests' ID.
*   `note` (str, required): The note's content.
*   `is_public` (bool, required): Whether to make the note public or not.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_ping`

Test connectivity to ServiceDesk Plus instance.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_update_request`

Update a request

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `request_id` (str, required): The id of the request to update.
*   `requester` (Optional[str], optional, default=None): The requester of the request. If not specified, set to the user of the API key.
*   `description` (Optional[str], optional, default=None): The description of the request.
*   `status` (Optional[str], optional, default=None): The status of the request.
*   `technician` (Optional[str], optional, default=None): The name of the technician assigned to the request.
*   `priority` (Optional[str], optional, default=None): The priority of the request.
*   `urgency` (Optional[str], optional, default=None): The urgency of the request.
*   `category` (Optional[str], optional, default=None): The category of the request.
*   `request_template` (Optional[str], optional, default=None): The template of the request.
*   `request_type` (Optional[str], optional, default=None): The type of the request. I.e: Incident, Service Request, etc.
*   `due_by_time_ms` (Optional[str], optional, default=None): The due date of the request in milliseconds.
*   `mode` (Optional[str], optional, default=None): The mode of the request.
*   `level` (Optional[str], optional, default=None): The level of the request.
*   `site` (Optional[str], optional, default=None): The site of the request.
*   `group` (Optional[str], optional, default=None): The group of the request.
*   `impact` (Optional[str], optional, default=None): The impact of the request.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_get_request`

Retrieve information about a request

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `request_id` (str, required): The ID of the request.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_close_request`

Close a request

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `request_id` (str, required): The request's ID.
*   `comment` (str, required): Closing comment.
*   `resolution_acknowledged` (bool, required): Whether the resolution of the request is acknowledged or not.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_wait_for_field_update`

Wait for a field of a request ot update to a desired value.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `request_id` (str, required): The ID of the request.
*   `field_name` (str, required): The name of the field to be updated.
*   `values` (str, required): Desired values for the given field.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_add_note`

Add a note to a request

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `request_id` (str, required): The requests' ID.
*   `note` (str, required): The note's content.
*   `is_public` (bool, required): Whether to make the note public or not.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `service_desk_plus_wait_for_status_update`

Wait for the status of a request ot update to a desired status.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `request_id` (str, required): The ID of the request.
*   `statuses` (str, required): Desired request statuses, comma separated.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
