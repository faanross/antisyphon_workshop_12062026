# Salesforce Integration

Connects Chronicle SOAR to Salesforce Service Cloud for managing customer support cases, potentially linking security incidents to customer issues or internal tracking.

## Configuration

*(Details on setting up the Salesforce integration, including API credentials (OAuth 2.0), connected app setup, and necessary Salesforce permissions, would go here.)*

## Key Actions (Tools)

The following actions are available through the Salesforce integration:

### `salesforce_get_case`

*   **Description:** Get case details
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `case_number` (str, required): The number of the case.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `salesforce_ping`

*   **Description:** Test Connectivity
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `salesforce_add_comment`

*   **Description:** Add a comment to a case
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `case_number` (str, required): The number of the case.
    *   `title` (str, required): The comment title
    *   `body` (str, required): The comment's body
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `salesforce_update_case`

*   **Description:** Update a case
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `case_number` (str, required): The number of the case.
    *   `subject` (Optional[str], optional, default: None): The case's subject
    *   `status` (Optional[str], optional, default: None): The case's status. Valid values: New, On Hold, Closed, Escalated
    *   `description` (Optional[str], optional, default: None): The description of the subject.
    *   `origin` (Optional[str], optional, default: None): The origin of the case. Valid values: Email, Phone, Web
    *   `priority` (Optional[str], optional, default: None): The case's priority. Valid values: Low, Medium, High
    *   `type` (Optional[str], optional, default: None): The case type. Valid values: Question, Problem, Feature Request
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `salesforce_search_records`

*   **Description:** Search all records that contain values with a given pattern
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `query` (str, required):
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `salesforce_create_case`

*   **Description:** Create a case
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `subject` (str, required): The case's subject.
    *   `status` (Optional[str], optional, default: None): The case's status. Valid values: New, On Hold, Closed, Escalated
    *   `description` (Optional[str], optional, default: None): The description of the subject.
    *   `origin` (Optional[str], optional, default: None): The origin of the case. Valid values: Email, Phone, Web
    *   `priority` (Optional[str], optional, default: None): The case's priority. Valid values: Low, Medium, High
    *   `type` (Optional[str], optional, default: None): The case type. Valid values: Question, Problem, Feature Request
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `salesforce_close_case`

*   **Description:** Close a case
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `case_number` (str, required): The number of the case.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `salesforce_list_cases`

*   **Description:** List all exising cases
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

## Use Cases

*   Creating Salesforce cases from SOAR alerts or incidents.
*   Updating Salesforce case details (status, priority, description) based on SOAR investigation progress.
*   Adding comments or findings from SOAR investigations to related Salesforce cases.
*   Retrieving Salesforce case details for context within SOAR.
*   Searching Salesforce records for related information during an investigation.
