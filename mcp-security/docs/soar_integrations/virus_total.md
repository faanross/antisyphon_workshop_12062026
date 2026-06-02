# VirusTotal SOAR Integration

## Overview

This document outlines the tools available for the VirusTotal integration within the SOAR platform. These tools allow interaction with the VirusTotal API for scanning and retrieving reports on various indicators like file hashes, URLs, IPs, and domains.

## Tools

### `virus_total_scan_hash`

Scan Hash via VirusTotal. *Mark entity as suspicious and show insights if risk score matches a given threshold.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `threshold` (str, required): Mark entity as suspicious if number of negative engines is equal or above the given threshold.
*   `rescan_after_days` (str, optional, default=None): Action will fetch the latest result. If the result is older than mentioned days it will automatically rescan the entity.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `virus_total_ping`

Test Connectivity.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `virus_total_upload_and_scan_files`

Upload and scan files via VirusTotal. *Files can be uploaded from remote path (Windows share or Linux remote server).

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `threshold` (str, required): Entity risk threshold.
*   `file_paths` (str, required): Target file path.
*   `linux_server_address` (str, optional, default=None): Linux server address(e.g: x.x.x.x).
*   `linux_user` (str, optional, default=None): Linux user for remote server connection.
*   `linux_password` (str, optional, default=None): Linux password for remote server connection.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `virus_total_scan_url`

Scan URL via VirusTotal. *Mark entity as suspicious and show insights if risk score matches a given threshold.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `threshold` (str, required): Mark entity as suspicious if number of negative engines is equal or above the given threshold.
*   `rescan_after_days` (str, optional, default=None): Action will fetch the latest result. If the result is older than mentioned days it will automatically rescan the entity.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `virus_total_scan_ip`

Scan IP via VirusTotal. Returns table of reverse domains and full Json result.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `threshold` (str, optional, default=None): Specify the accepted threshold for the detected samples related to the IP address. If the number of engines that marked related samples as malicious is higher than the specified threshold, IP address will be marked as suspicious.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `virus_total_get_domain_report`

Scan Domain via VirusTotal. *Check online report for full details.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=None): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
