# SysdigSecure SOAR Integration

## Overview
This document outlines the tools available in the Sysdig Secure SOAR integration. This integration currently provides a tool to test connectivity.

## Tools

### `sysdig_secure_ping`
Use the Ping action to test the connectivity to Sysdig Secure.

**Parameters:**
*   `case_id` (str, required): The ID of the case.
*   `alert_group_identifiers` (List[str], required): Identifiers for the alert groups.
*   `target_entities` (List[TargetEntity], optional, default=[]): Optional list of specific target entities (Identifier, EntityType) to run the action on.
*   `scope` (str, optional, default='All entities'): Defines the scope for the action.
