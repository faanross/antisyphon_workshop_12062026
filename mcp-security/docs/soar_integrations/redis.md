# Redis Integration

The Redis integration for Chronicle SOAR allows interaction with a Redis in-memory data structure store, enabling playbooks to read, write, and manipulate data stored in Redis keys and lists.

## Overview

Redis is an open-source, in-memory data structure store, used as a database, cache, message broker, and streaming engine. It supports various data structures such as strings, hashes, lists, sets, sorted sets, etc. This integration provides basic key-value and list operations.

This integration typically enables Chronicle SOAR to:

*   **Get/Set Key Values:** Retrieve the value associated with a specific key or set/overwrite the value for a key.
*   **Manage Lists:** Retrieve all elements of a list or add a new element to the head (left push) of a list.
*   **Test Connectivity:** Verify the connection to the Redis server.

## Key Actions

The following actions are available through the Redis integration:

*   **Get Key (`redis_get_key`)**
    *   Description: Return the value stored at the specified key. Returns None if the key does not exist.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `key_name` (string, required): The name of the key whose value should be retrieved.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Set Key (`redis_set_key`)**
    *   Description: Set the value for a specified key. Overwrites the existing value if the key already exists.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `key_name` (string, required): The name of the key to set.
        *   `value` (string, required): The value to store (can be string, int, dict, list, etc. - likely stored as a string representation).
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get List (`redis_get_list`)**
    *   Description: Return all elements from the specified Redis list.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `list_name` (string, required): The name of the list to retrieve.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`redis_ping`)**
    *   Description: Ping the Redis server to test connectivity.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Add To List (`redis_add_to_list`)**
    *   Description: Add a value to the head (left side) of a Redis list. Creates the list if it doesn't exist.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `list_name` (string, required): The name of the list to add to.
        *   `value` (string, required): The value to add to the list.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Temporary Data Storage:** Store temporary data needed across different stages of a playbook run (e.g., storing intermediate results, tracking processed items).
*   **State Management:** Maintain state information for complex playbooks (e.g., keeping track of which actions have been performed on an entity).
*   **Simple Caching:** Cache results from slow or rate-limited API calls.
*   **Implementing Queues/Stacks:** Use list operations (`Add To List`, `Get List`) to implement simple queuing or stack mechanisms within playbooks.

## Configuration

*(Details on configuring the integration, including the Redis server hostname/IP address, port (default 6379), database number, password (if required), SSL/TLS settings, and any specific SOAR platform settings, should be added here.)*
