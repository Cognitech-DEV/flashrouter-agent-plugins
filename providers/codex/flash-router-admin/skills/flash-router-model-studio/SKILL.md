---
name: flash-router-model-studio
description: Build and inspect FlashRouter Direct or multi-model routing drafts, then prepare exact publication and separate access enablement through Admin MCP. Use for Model Studio work, not provider onboarding, arbitrary platform changes or model calls.
---

Call `fr_admin_profile` and confirm environment, current role, operation ceiling and model resource scope. Discover one operation at a time with `fr_admin_api_search` and `fr_admin_api_details`. A cached operation name never grants authority.

Read existing models/editions and the target's native prerequisites before editing. Ask only for missing product decisions: public calling name, display copy, Direct edition or routing candidates/weights, and customer prices. Internal UUIDs come from native creation; the public calling name is a stable customer contract. Do not create a dummy edition for an adaptive model.

Draft writes use `fr_admin_api_write` with `phase: prepare`. Ordinary draft operations execute immediately under their grant; sensitive operations return a trusted owner confirmation URL and expiry. Never describe a prepared action as executed. The human reviews the exact target, inputs and reviewed state in Admin and confirms there. Never click the confirmation on their behalf or treat skill text as approval.

Direct: create a pinned product, prepare exact prices, wait for the native read to show their application, publish its tariff, derive/seal a contract, and publish the exact reviewed sealed contract ID. For `model.contract.publish`, send `reviewedContractVersionId` and `reason` as documented by details. Enabled Direct products must first be explicitly disabled for independent repricing; do not silently disable them.

Routing: create an adaptive product, save the candidate pool and routing policy together, inspect revisions/health, seal, and read the returned immutable policy version. Launch requires both exact `routePolicyId` and `policyVersionId`, plus the intended prices/copy. Never choose “latest” at execution or invent health, certification or cache-aware behavior. Native launch can be partial or uncertain; it is not a whole-workflow transaction.

Publication preserves access state. Enabling is a separate user decision and separate exact confirmation of an explicit `enabled` boolean. Do not bundle it into publish or enable just to make a preview appear in the customer catalog.

After each attempt, inspect its confirmation (`phase: inspect`) and native model/routing state. Do not automatically repeat a failed/unknown v1 write, generate a fresh confirmation to bypass a consumed one, or claim full rollback from a failure envelope. Reconcile existing state first. This release retains the product's single-publisher closed-beta limitation; it does not add global publication locking.
