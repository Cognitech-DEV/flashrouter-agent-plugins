---
name: flash-router-workspace-inspection
description: Inspect FlashRouter Console model catalog, workspace credit balance and usage through its read-only MCP connection. Use for customer workspace inspection, not platform administration, payments or LLM calls.
---

Let the native authorization card handle missing/expired login; follow the Console setup workflow for a requested grant change. Start with `fr_console_profile`. Confirm the bound organization and environment before any conclusion. This first version accepts current full organization membership only; it does not represent a Partner's customer or App-only scope.

Find the needed operation with `fr_console_api_search`, read its contract with `fr_console_api_details`, then invoke `fr_console_api_read` with the supported bounded query. Do not supply another organization identifier or infer access from a known ID. The server resolves the organization from the connection.

Preserve native units: current customer money strings are micro-JPY; model price display strings use JPY per million tokens; follow explicit currency on historical or provider-cost evidence; unknown cost/usage stays unknown, never zero. Explain missing coverage separately from confirmed consumption. The published model catalog is not a guarantee that a particular Key can call every listed model.

This connection has no write tool. A recharge request is not a payment, and credits cannot be added with this plugin. Do not request or reveal API keys, execute inference or submit a payment. Report the missing capability and the relevant trusted product page when the user needs it.
