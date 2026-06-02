# Zendesk Integration

This document describes the available tools for the Zendesk integration within the SecOps SOAR MCP Server. Zendesk is a customer service and ticketing platform.

## Configuration

Ensure the Zendesk integration is configured in the SOAR platform with your Zendesk subdomain, agent email address, and API token.

## Available Tools

### zendesk_create_ticket
- **Description:** Create a new ticket in Zendesk with specified properties.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `subject` (str, required): The subject line for the new ticket.
    - `description` (str, required): The initial description or comment for the ticket body.
    - `assigned_user` (str, optional): Full name of the user to assign the ticket to. Defaults to None.
    - `assignment_group` (str, optional): Name of the group to assign the ticket to. Defaults to None.
    - `priority` (str, optional): Ticket priority ("urgent", "high", "normal", "low"). Defaults to None.
    - `ticket_type` (str, optional): Ticket type ("problem", "incident", "question", "task"). Defaults to None.
    - `tag` (str, optional): Tag(s) to add to the ticket. Defaults to None.
    - `internal_note` (bool, optional): If true, the initial description is an internal note. Defaults to None (public).
    - `email_c_cs` (str, optional): Comma-separated list of email addresses to CC (max 48). Defaults to None.
    - `validate_email_c_cs` (bool, optional): If enabled, validate that CC'd users exist in Zendesk. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the details of the created ticket, including its ID.

### zendesk_get_ticket_details
- **Description:** Get details, comments, and attachments for a specific Zendesk ticket by its ID.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `ticket_id` (str, required): The ID of the Zendesk ticket.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the ticket details, comments, and attachment information.

### zendesk_add_comment_to_ticket
- **Description:** Add a comment (public or internal) to an existing Zendesk ticket.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `ticket_id` (str, required): The ID of the Zendesk ticket.
    - `comment_body` (str, required): The text content of the comment.
    - `internal_note` (bool, required): Specify `true` for an internal note, `false` for a public comment.
    - `author_name` (str, optional): Name of the author (must exist in Zendesk). Defaults to the integration user if None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the comment addition.

### zendesk_ping
- **Description:** Test connectivity to the Zendesk instance using the configured credentials.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the connectivity test.

### zendesk_apply_macros_on_ticket
- **Description:** Apply a predefined macro to a specific Zendesk ticket.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `ticket_id` (str, required): The ID of the Zendesk ticket.
    - `macro_title` (str, required): The exact title of the macro to apply.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of applying the macro.

### zendesk_update_ticket
- **Description:** Update various details of an existing Zendesk ticket.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `ticket_id` (str, required): The ID of the Zendesk ticket to update.
    - `subject` (str, optional): New subject for the ticket. Defaults to None.
    - `assigned_user` (str, optional): Full name of the user to assign the ticket to. Defaults to None.
    - `assignment_group` (str, optional): Name of the group to assign the ticket to. Defaults to None.
    - `priority` (str, optional): New priority ("urgent", "high", "normal", "low"). Defaults to None.
    - `ticket_type` (str, optional): New ticket type ("problem", "incident", "question", "task"). Defaults to None.
    - `tag` (str, optional): Tag(s) to add to the ticket. Defaults to None.
    - `status` (str, optional): New status ("new", "open", "pending", "hold", "solved", "closed"). Defaults to None.
    - `internal_note` (bool, optional): Specify if the `additional_comment` should be internal. Defaults to None.
    - `additional_comment` (str, optional): Text to add as a new comment during the update. Defaults to None.
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the result of the ticket update.

### zendesk_search_tickets
- **Description:** Search for Zendesk tickets using a Zendesk search query string.
- **Args:**
    - `case_id` (str, required): The ID of the case.
    - `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    - `search_query` (str, required): The Zendesk search query (e.g., `type:ticket status:pending`).
    - `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to run the action on. Defaults to empty list.
    - `scope` (str, optional): Defines the scope for the action (e.g., "All entities"). Defaults to "All entities". Used if `target_entities` is empty.
- **Returns:** (dict) A dictionary containing the list of tickets matching the search query.
