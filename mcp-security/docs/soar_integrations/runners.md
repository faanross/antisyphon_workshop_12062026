# Runners Integration

Provides capabilities to execute commands remotely on endpoints, typically via agents or specific protocols.

## Configuration

*(Details on setting up the Runners integration, including agent deployment, authentication methods, and network requirements, would go here.)*

## Key Actions (Tools)

The following actions are available through the Runners integration:

### `runners_run_command_as_user`

*   **Description:** Run a command as a user (Windows only).
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `command` (str, required): The command to run, e.g: whoami
    *   `username` (str, required):
    *   `domain` (str, required): User's domain.
    *   `password` (str, required):
    *   `daemon` (bool, required): Whether to run in the background or not
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `runners_ping`

*   **Description:** Test Connectivity
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

## Use Cases

*   Executing diagnostic commands on remote Windows endpoints.
*   Running remediation scripts or commands as a specific user.
*   Gathering information from endpoints during an investigation.
