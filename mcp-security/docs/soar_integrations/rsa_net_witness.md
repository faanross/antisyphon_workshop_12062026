# RSA NetWitness Integration

Connects Chronicle SOAR to the RSA NetWitness Platform for network forensics, log analysis, and threat detection.

## Configuration

*(Details on setting up the RSA NetWitness integration, including API credentials, endpoint URLs, and necessary permissions, would go here.)*

## Key Actions (Tools)

The following actions are available through the RSA NetWitness integration:

### `rsa_net_witness_update_the_ti_database_of_net_witness`

*   **Description:** Set custom feed configuration in NetWitness to enrich entities with specific metadata keys and values. These will be later correlated in the NetWitness correlation rules.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `key_value_string` (str, required): A key value string,which is presented in the current format: key1:val1,key2:val2
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `rsa_net_witness_query_net_witness_for_events_around_ip`

*   **Description:** Run a query on RSA NetWitness to retreive all events for a specific query (conditions) for a given IP address in the alert.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `rsa_net_witness_query_net_witness_for_events_around_host`

*   **Description:** Run a query on RSA NetWitness to retreive all events for a specific query (conditions) for a given hostname in the alert.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `rsa_net_witness_run_general_query`

*   **Description:** Run free query and receive event and a PCAP file.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `query` (str, required): Custom query string.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `rsa_net_witness_ping`

*   **Description:** Test Connectivity
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `rsa_net_witness_update_the_ti_database_of_net_witness_raw_input`

*   **Description:** Set custom feed configuration in NetWitness to enrich entities with specific metadata keys and values. These will be later correlated in the NetWitness correlation rules.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `identifiers` (str, required): Comma separated identifiers list.
    *   `key_and_value_items` (str, required): Comma separated values when each value is a key value pair separated by colon, Example: key:val,key:val
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

### `rsa_net_witness_query_net_witness_for_events_around_user`

*   **Description:** Run a query on RSA NetWitness to retreive all events for a specific query (conditions) for a given username in the alert.
*   **Parameters:**
    *   `case_id` (str, required): The ID of the case.
    *   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
    *   `target_entities` (List[TargetEntity], optional, default: []): Optional list of specific target entities (Identifier, EntityType) to run the action on.
    *   `scope` (str, optional, default: "All entities"): Defines the scope for the action.

## Use Cases

*   Querying NetWitness for events related to specific IPs, hosts, or users identified in SOAR alerts.
*   Updating NetWitness threat intelligence feeds based on SOAR findings.
*   Retrieving PCAP data for deep-dive network analysis.
