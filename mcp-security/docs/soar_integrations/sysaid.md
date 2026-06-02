# SysAid SOAR Integration

## Overview
This document outlines the tools available in the SysAid SOAR integration. These tools allow interaction with SysAid for managing service requests (listing, creating, updating, deleting, closing), listing users, and testing connectivity.

## Tools

### `sys_aid_list_service_requests`
List service requests.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `service_request_type` (Optional[str], optional, default=None): The type of the service request to filter by. Valid values: incident, request, problem, change, all.
*   `status` (Optional[str], optional, default=None): The status of the request service to filter by.
*   `priority` (Optional[str], optional, default=None): The priority of the request service to filter by.
*   `assignee` (Optional[str], optional, default=None): The assignee of the request service to filter by.
*   `urgency` (Optional[str], optional, default=None): The urgency of the request service to filter by.
*   `request_user` (Optional[str], optional, default=None): The request user of the request service to filter by.
*   `category` (Optional[str], optional, default=None): The category of the request service to filter by.
*   `subcategory` (Optional[str], optional, default=None): The subcategory of the request service to filter by.
*   `third_category` (Optional[str], optional, default=None): The third category of the request service to filter by.
*   `assigned_group` (Optional[str], optional, default=None): The assigned group of the request service to filter by.
*   `get_archived` (Optional[bool], optional, default=None): Whether to get archived request services or not.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sys_aid_delete_service_request`
Delete a service request.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `service_request_id` (str, required): The ID of the service request to delete.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sys_aid_get_service_request`
Get a service request.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `service_request_id` (str, required): The ID of the service request to get info about.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sys_aid_ping`
Test SysAid connectivity.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sys_aid_update_service_request`
Update a service request.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `service_request_id` (str, required): The id of the service request to update.
*   `status` (Optional[str], optional, default=None): The new status of the request service.
*   `priority` (Optional[str], optional, default=None): The new priority of the request service.
*   `assignee` (Optional[str], optional, default=None): The new assignee of the request service.
*   `urgency` (Optional[str], optional, default=None): The new urgency of the request service.
*   `request_user` (Optional[str], optional, default=None): The new request user of the request service.
*   `category` (Optional[str], optional, default=None): The new category of the request service.
*   `subcategory` (Optional[str], optional, default=None): The new subcategory of the request service.
*   `third_category` (Optional[str], optional, default=None): The new third category of the request service.
*   `assigned_group` (Optional[str], optional, default=None): The new assigned group of the request service.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sys_aid_close_service_request`
Close a service request.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `service_request_id` (str, required): The ID of the service request to delete.
*   `solution` (str, required): The solution of the request service.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sys_aid_create_service_request`
Create a service request.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `title` (str, required): The title of the service request.
*   `description` (str, required): The description of the service request.
*   `status` (str, required): The status of the request service.
*   `priority` (str, required): The priority of the request service.
*   `assignee` (str, required): The assignee of the request service.
*   `urgency` (str, required): The urgency of the request service.
*   `service_request_type` (Optional[str], optional, default=None): The type of the service request. Valid values: incident, request, problem, change, all.
*   `request_user` (Optional[str], optional, default=None): The request user of the request service.
*   `category` (Optional[str], optional, default=None): The category of the request service.
*   `subcategory` (Optional[str], optional, default=None): The subcategory of the request service.
*   `third_category` (Optional[str], optional, default=None): The third category of the request service.
*   `assigned_group` (Optional[str], optional, default=None): The assigned group of the request service.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `sys_aid_list_users`
List SysAid users.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.
