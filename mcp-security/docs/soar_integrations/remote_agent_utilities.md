# Remote Agent Utilities Integration

The Remote Agent Utilities integration for Chronicle SOAR provides helper actions primarily for handling files between the main SOAR server and remote agents, often used in conjunction with other integrations that might retrieve or require files on remote systems.

## Overview

This integration facilitates the transfer or manipulation of files in scenarios involving remote agents, typically by converting files to/from base64 encoding for easier transport within playbook data.

## Key Actions

The following actions are available through the Remote Agent Utilities integration:

*   **Serialize A File (`remote_agent_utilities_serialize_a_file`)**
    *   Description: Read a file from a specified path (presumably on the remote agent where the action executes) and convert its content to a base64 encoded string.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `file_path` (string, required): Full path of the file to serialize.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.
    *   Returns: Dictionary containing `file_name` and `base64_file_content`.

*   **Deserialize A File (`remote_agent_utilities_deserialize_a_file`)**
    *   Description: Take a base64 encoded string and a filename, decode the string, and save the resulting content to a file (presumably on the remote agent where the action executes). The file is typically saved in a temporary or designated agent directory.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `file_name` (string, required): The desired name for the output file. Often taken from the output of the `Serialize A File` action.
        *   `file_base64` (string, required): The base64 encoded content of the file. Often taken from the output of the `Serialize A File` action.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.
    *   Returns: Dictionary likely containing the path where the file was saved.

*   **Ping (`remote_agent_utilities_ping`)**
    *   Description: Test connectivity, likely verifying the utility integration is active on the agent.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **File Transfer for Analysis:** Use `Serialize A File` on a remote agent to get the content of a suspicious file, pass the base64 string back to the main SOAR instance, submit it to a sandbox integration (like VMRay or WildFire), then potentially use `Deserialize A File` on another agent if needed.
*   **Deploying Files/Scripts:** Use `Deserialize A File` on a remote agent to write a script or configuration file (provided as base64) to the agent's disk before executing it with another action (e.g., SSH or PowerShell).

## Configuration

*(This integration typically does not require specific configuration beyond ensuring the remote agent is installed and connected to the SOAR platform.)*
