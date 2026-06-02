# CSV Integration

## Overview

This integration provides utilities for working with CSV files directly on the SOAR server's filesystem. Actions include searching for entities or strings within CSV files and saving JSON data to a CSV file.

## Configuration

This integration does not require specific configuration parameters on the Marketplace tab. It operates directly on file paths provided within the actions. Ensure the SOAR agent/server has the necessary file system permissions to read from and write to the specified paths.

## Key Actions

The following actions are available through the CSV integration:

*   **CSV Search by Entity (`csv_csv_search_by_entity`)**
    *   Description: Search for entities in CSV files and enrich them.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `csv_path` (string, required): File path to the CSV file or a folder path containing CSV files.
        *   `file_encoding_types` (string, required): Comma-separated list of encoding types to try (e.g., `utf-8,latin-1`). Order determines priority.
        *   `csv_column` (string, optional): Comma-separated list of columns to search within. If empty, searches all columns.
        *   `days_back` (string, optional): Process CSV files modified within this number of days back.
        *   `mark_as_suspicious` (bool, optional): Mark the entity as suspicious if found.
        *   `return_the_first_row_only` (bool, optional): Return only the first matching row from the first matching file.
        *   `enrich_entities` (bool, optional): Add data from the matching CSV row to the entity's enrichment table.
        *   `create_insight` (bool, optional): Create an insight if the entity is found.
        *   `fields_to_return` (string, optional): Comma-separated list of column names whose values should be returned.
        *   `target_entities` (List[TargetEntity], optional): Specific target entities (Identifier, EntityType) to search for.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action (used if `target_entities` is not provided).

*   **Ping (`csv_ping`)**
    *   Description: Test Connectivity. Verifies the integration is active but does not test specific file permissions.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Save Json To CSV (`csv_save_json_to_csv`)**
    *   Description: Save a JSON object (typically a list of flat dictionaries) to a CSV file.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `json_object` (Union[str, dict], required): The JSON object to save.
        *   `file_path` (string, required): Absolute path for the output CSV file (defaults to `/tmp/` if only filename is given).
        *   `overwrite` (bool, optional): Overwrite the file if it already exists.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **CSV Search by String (`csv_csv_search_by_string`)**
    *   Description: Search for specific strings within CSV files.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `csv_path` (string, required): File path to the CSV file or a folder path containing CSV files.
        *   `search_value` (string, required): String to search for. If `search_multiple_strings` is enabled, this is a comma-separated list.
        *   `file_encoding_types` (string, required): Comma-separated list of encoding types to try (e.g., `utf-8,latin-1`). Order determines priority.
        *   `csv_column` (string, optional): Comma-separated list of columns to search within. If empty, searches all columns.
        *   `days_back` (string, optional): Process CSV files modified within this number of days back.
        *   `return_the_first_row_only` (bool, optional): Return only the first matching row from the first matching file.
        *   `fields_to_return` (string, optional): Comma-separated list of column names whose values should be returned.
        *   `search_multiple_strings` (bool, optional): Treat `search_value` as a comma-separated list.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Notes

*   This integration operates on the local filesystem of the SOAR server/agent. Ensure appropriate file paths and permissions are set.
*   Provide multiple encoding types in `file_encoding_types` if unsure about the exact encoding of the CSV files.
*   The `Save Json To CSV` action works best with a JSON structure representing a list of flat objects (key-value pairs).
