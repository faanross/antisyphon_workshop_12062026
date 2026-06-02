# Microsoft System Center Configuration Manager (SCCM) Integration

Connects Chronicle SOAR to Microsoft SCCM (now part of Microsoft Endpoint Configuration Manager) for managing and retrieving information about Windows endpoints within an enterprise environment.

## Configuration

*(Details on setting up the SCCM integration, including necessary service accounts, permissions (WMI access), network connectivity, and potentially WinRM configuration, would go here.)*

## Key Actions (Tools)

The following actions are available through the SCCM integration:

### `sccm_ping`

*   **Description:** Test connectivity to Microsoft SCCM instance with parameters provided at the integration configuration page on Marketplace tab.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `sccm_enrich_entities`

*   **Description:** Enrich Siemplify Host, IP or User entities based on the information from the Microsoft SCCM.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `sccm_run_wql_query`

*   **Description:** Run arbitrary Windows Management Instrumentation Query Language (WQL) query against Microsoft SCCM Instance. Note: action is not using Siemplify entities to operate.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `query_to_run` (str, required): Specify WQL query to run. Consider the default example request for reference.
    *   `number_of_records_to_return` (str, required): Maximum number of records to return in action.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `sccm_get_computer_properties`

*   **Description:** Deprecated, please use the "Enrich Entities" action instead. Get computer properties from MS SCCM instance and use obtained information to enrich the provided Siemplify Host entity.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `sccm_get_login_history`

*   **Description:** Retrieve user login history from MS SCCM instance based on the provided Siemplify user entity.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `number_of_records_to_return` (str, required): Maximum number of records to return in the action.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

## Use Cases

*   Enriching host, IP, and user entities in SOAR with details from SCCM (e.g., OS version, installed software, last logged-on user).
*   Retrieving login history for specific users from SCCM during investigations.
*   Running custom WQL queries against SCCM to gather specific asset or configuration information.
