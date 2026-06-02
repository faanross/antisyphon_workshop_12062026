# PostgreSQL Integration

The PostgreSQL integration for Chronicle SOAR provides the capability to connect to and interact with PostgreSQL databases directly from within SOAR playbooks.

## Overview

PostgreSQL is a powerful, open-source object-relational database system. This integration allows security teams to query data from, or write data to, PostgreSQL databases as part of their automated workflows. This is useful for accessing custom data sources, asset inventories, CMDBs, or other relevant information stored in PostgreSQL format.

This integration typically enables:

*   **Executing Queries:** Run arbitrary SQL SELECT queries to retrieve data.
*   **Executing Commands:** Run SQL commands like INSERT, UPDATE, or DELETE to modify data (use with caution).
*   **Testing Connectivity:** Verify the connection parameters to the database.

## Key Actions

The following actions are available through the PostgreSQL integration:

*   **Run SQL Query (`postgre_sql_run_sql_query`)**
    *   Description: Run an SQL query (SELECT, INSERT, UPDATE, DELETE, etc.) against the specified database.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `database_name` (string, required): The name of the target database.
        *   `query` (string, required): The SQL query to execute (e.g., `SELECT * FROM my_table WHERE id = '123'`).
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`postgre_sql_ping`)**
    *   Description: Test connectivity to the configured PostgreSQL server and database.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **Data Enrichment:** Enrich SOAR entities (e.g., users, assets, IPs) by querying a PostgreSQL-based CMDB or asset inventory for additional context (e.g., owner, location, business unit).
*   **Custom Threat Intelligence:** Query internal threat intelligence databases stored in PostgreSQL.
*   **Storing Investigation Results:** Insert key findings or indicators from a SOAR case into a custom PostgreSQL database for reporting or historical analysis.
*   **Interacting with Custom Applications:** Query or update data in the backend PostgreSQL databases of internal applications as part of a response workflow.

## Configuration

*(Details on configuring the integration, including PostgreSQL server hostname/IP address, port (default 5432), database name, username, password, SSL/TLS settings, and any specific SOAR platform settings, should be added here.)*

**Security Note:** Ensure the database user configured for the SOAR integration has the minimum necessary privileges required for the intended actions (e.g., read-only access if only querying is needed). Avoid using highly privileged database accounts. Securely manage the database credentials within the SOAR platform.
