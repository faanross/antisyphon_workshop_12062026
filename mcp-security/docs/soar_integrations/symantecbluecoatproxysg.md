# SymantecBlueCoatProxySG SOAR Integration

## Overview
This document outlines the tools available in the Symantec Blue Coat ProxySG SOAR integration. These tools allow interaction with Symantec Blue Coat ProxySG for blocking entities, testing connectivity, and enriching entities.

## Tools

### `symantec_blue_coat_proxy_sg_block_entities`
Block entities using Symantec Blue Coat ProxySG. Supported entities: IP Address.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `symantec_blue_coat_proxy_sg_ping`
Test connectivity to the Symantec Blue Coat ProxySG with parameters provided at the integration configuration page on the Marketplace tab.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.

### `symantec_blue_coat_proxy_sg_enrich_entities`
Enrich entities using information from Symantec Blue Coat ProxySG. Supported entities: Hostname, IP Address, URL.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `create_insight` (Optional[bool], optional, default=None): If enabled, action will create an insight containing all of the retrieved information about the entity.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.
