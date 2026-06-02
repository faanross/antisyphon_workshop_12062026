# SSH SOAR Integration

## Overview

This integration provides tools for interacting with remote machines via SSH from within the Chronicle SOAR platform. It allows running commands, managing processes, users, connections, iptables rules, and system state (reboot, shutdown), as well as testing connectivity.

## Tools

### `ssh_terminate_process`

Terminate process on a remote machine

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x)
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `process` (str, required): Process to terminate.
*   `remote_port` (Optional[str], optional, default=None): Remote port.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_reboot_machine`

Reboot remote server

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x).
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `remote_port` (Optional[str], optional, default=None): The default port will be 22.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_logoff_user`

Log off remote user

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x)
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `logoff_username` (str, required): The username to log off.
*   `remote_port` (Optional[str], optional, default=None): The default port will be 22.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_ping`

Test Connectivity

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_execute_program`

Run script on a remote machine

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x).
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `remote_program_path` (str, required): The path to the program in the remote host.
*   `remote_port` (Optional[str], optional, default=None): Remote port.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_list_processes`

List running processes on a remote machine

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x).
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `remote_port` (Optional[str], optional, default=None): The default port will be 22.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_list_iptables_rules`

List iptables rules on a remote machine

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x)
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `remote_port` (Optional[str], optional, default=None): The default port will be 22.
*   `chain` (Optional[str], optional, default=None): The iptables chain that you wish to see (e.g: INPUT, OUTPUT, etc.)
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_run_command`

Run command on a remote machine

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x).
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `command` (str, required): Command content(e.g: ifconfig).
*   `remote_port` (Optional[str], optional, default=None): Remote port.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_list_connections`

List all connections on a remote machine

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x).
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `remote_port` (Optional[str], optional, default=None): Remote port.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_block_ip_address_in_iptables`

Add rule to iptables to block IP address

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x).
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `block_ip_address` (str, required): IP address to block(e.g: x.x.x.x).
*   `remote_port` (Optional[str], optional, default=None): Remote port.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_shutdown_machine`

Shutdown remote machine

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x)
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `wait_time` (str, required): Time to wait before shutdown in minutes(e.g: now).
*   `remote_port` (Optional[str], optional, default=None): The default port will be 22.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `ssh_delete_firewall_rule`

Delete iptables Firewall rule (Example: INPUT -s 10.0.0.10 -j DROP)

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `remote_server` (str, required): Remote server address(e.g: x.x.x.x).
*   `remote_username` (str, required): Remote username.
*   `remote_password` (str, required): Remote password.
*   `i_ptables_rule` (str, required): Rule value(e.g: INPUT -s 10.0.0.10 -j DROP)
*   `remote_port` (Optional[str], optional, default=None): Remote port.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
