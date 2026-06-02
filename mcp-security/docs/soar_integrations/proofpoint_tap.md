# Proofpoint TAP SOAR Integration

This document details the tools provided by the Proofpoint TAP SOAR integration.

## Overview

Proofpoint Targeted Attack Protection (TAP) helps detect, mitigate, and block advanced threats that target people through email. This integration allows Chronicle SOAR to interact with Proofpoint TAP for tasks like decoding URLs and retrieving campaign information.

## Tools

### `proof_point_tap_get_campaign`

Return information about campaigns in Proofpoint TAP.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `campaign_id` (str, required): Specify a comma-separated list of campaign IDs for which you want to return info.
*   `create_insight` (Optional[bool], optional, default=None): If enabled, action will create an insight containing information about the campaign.
*   `create_threat_campaign_entity` (Optional[bool], optional, default=None): If enabled, action will create a threat campaign entity from the enriched campaigns.
*   `fetch_forensics_info` (Optional[bool], optional, default=None): If enabled, action will return forensics information about the campaigns.
*   `forensic_evidence_type_filter` (Optional[str], optional, default=None): Specify a comma-separated list of evidence types that need to be returned, when fetching forensic info. Possible values: attachment, cookie, dns, dropper, file, ids, mutex, network, process, registry, screenshot, url, redirect_chain, behavior.
*   `max_forensics_evidence_to_return` (Optional[str], optional, default=None): Specify how much evidence to return per campaign. Default: 50. Maximum: 1000.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `proof_point_tap_decode_url`

Decode URLs in Proofpoint TAP. Supported entities: URL.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `encoded_ur_ls` (Optional[str], optional, default=None): Specify a comma-separated list of URLs that need to be decoded. Note: URL entities in the scope of the alert will be decoded together.
*   `create_url_entities` (Optional[bool], optional, default=None): If enabled, action will create URL entities that were successfully decoded.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.

### `proof_point_tap_ping`

Test connectivity to the Proofpoint TAP with parameters provided at the integration configuration page on the Marketplace tab.

**Parameters:**

*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default="All entities"): Defines the scope for the action.
