# VMware vCenter Integration

The VMware vCenter integration for Chronicle SOAR allows interaction with the VMware vCenter Server, enabling management and orchestration of virtual machines (VMs) and other vSphere objects directly from SOAR playbooks.

## Overview

VMware vCenter Server is the centralized management platform for VMware vSphere environments. It provides control and visibility over virtualized infrastructure, including ESXi hosts, VMs, storage, and networking.

This integration typically enables Chronicle SOAR to:

*   **Manage VM Power State:** Power on, power off, suspend, or reset VMs.
*   **Manage VM Snapshots:** Create, delete, or revert to VM snapshots.
*   **Retrieve VM Information:** Get details about VMs, such as power state, IP address, MAC address, assigned host, datastore, tags, and configuration.
*   **Network Management:** Potentially connect or disconnect VM network interface cards (NICs).
*   **Tagging:** Add or remove vSphere tags from VMs for categorization or policy application.

## Key Actions

The following actions are available through the VMware vCenter (VSphere) integration:

*   **Suspend VM (`v_sphere_suspend`)**
    *   Description: Suspend a specific virtual machine.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `vm_name` (string, required): The name of the target VM.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Take Snapshot (`v_sphere_take_snapshot`)**
    *   Description: Take a snapshot of a specific virtual machine.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `vm_name` (string, required): The name of the target VM.
        *   `snapshot_name` (string, required): The desired name for the snapshot.
        *   `snapshot_description` (string, required): Description for the snapshot.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get VM By IP (`v_sphere_get_vm_by_ip`)**
    *   Description: Get the VM name associated with a specific IP address entity.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Specific IP Address entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Revert To Snapshot (`v_sphere_revert_to_snapshot`)**
    *   Description: Revert a VM to a specific snapshot by name.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `vm_name` (string, required): The name of the target VM.
        *   `snapshot_name` (string, required): The name of the target snapshot to revert to.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Power On VM (`v_sphere_power_on`)**
    *   Description: Power on a specific virtual machine.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `vm_name` (string, required): The name of the target VM.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Reset VM (`v_sphere_reset`)**
    *   Description: Perform a hard reset on a specific virtual machine.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `vm_name` (string, required): The name of the target VM.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Ping (`v_sphere_ping`)**
    *   Description: Test connectivity to the vCenter server.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Power Off VM (`v_sphere_power_off`)**
    *   Description: Power off a specific virtual machine.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `vm_name` (string, required): The name of the target VM.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **Get System Info (`v_sphere_get_system_info`)**
    *   Description: Get information about a specific virtual machine.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `vm_name` (string, required): The name of the target VM.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

*   **List VMs (`v_sphere_list_vms`)**
    *   Description: Get a list of all registered VMs known to the vCenter server.
    *   Parameters:
        *   `case_id` (string, required): The ID of the case.
        *   `alert_group_identifiers` (List[string], required): Identifiers for the alert groups.
        *   `target_entities` (List[TargetEntity], optional): Optional list of specific target entities.
        *   `scope` (string, optional, default="All entities"): Defines the scope for the action.

## Use Cases

*   **VM Containment:** When a VM is identified as compromised, automatically power it off or disconnect its NIC using the vCenter integration.
*   **Forensic Snapshotting:** Before taking disruptive response actions on a VM, create a snapshot via the integration for later forensic analysis.
*   **VM Enrichment:** Enrich SOAR asset entities with details fetched from vCenter, such as the VM's host, datastore, and assigned tags.
*   **Remediation:** After cleaning a compromised VM, use the integration to power it back on or revert it to a clean snapshot.
*   **Automated Provisioning/Decommissioning (Less Common for SOAR):** While possible, using SOAR for routine VM provisioning is less common than using dedicated orchestration tools.

## Configuration

*(Details on configuring the integration, including the vCenter Server URL, API credentials (username/password, potentially requiring specific vCenter roles/permissions), and any specific SOAR platform settings like SSL verification options, should be added here.)*
