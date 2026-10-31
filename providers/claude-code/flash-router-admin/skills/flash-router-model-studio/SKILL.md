---
name: flash-router-model-studio
description: Create and configure FlashRouter Direct or Policy API models, inspect drafts and prepare publication through Admin MCP. Use for native upstream credential handoff, model import, edition configuration/certification, deployment approval, routing candidates and customer prices; not credential submission, inference hosting or model calls.
---

## Scope and inputs

Start with `fr_admin_profile`: verify the environment, current role, operation ceiling and model scope. Discover the operation with `fr_admin_api_search`, then read `fr_admin_api_details` for its inputs and confirmation policy. Use the native contracts returned by details; cached operation names grant no authority.

Let the client's native authorization card handle an unauthenticated profile request. If the requested model work exceeds the current grant, use `fr_admin_authorize` once when available with only the current profile's nonsecret `connectionId`, then wait for the human's native consent. Draft creation/import/edition edits/deployment approval require Operator or higher; edition certification requires Admin. Re-read profile and rediscover after consent before any dependent command. A renewed login alone does not prove permission increased. Stop if authority is still insufficient or consent is cancelled; do not loop or replay an uncertain write. OAuth consent does not replace exact-action confirmations.

## Upstream setup through native Admin

For a new upstream or credential change, use `nativeAdmin.upstreamsUrl` from the profile as a link for the human operator. Collect only nonsecret inputs: display name, protocol, API base URL and intended model IDs. The operator opens Admin in their own browser and enters the API key in its existing secret field. Never request a key in chat, put it in MCP parameters/results, URLs or logs, or inspect, screenshot, type into or submit the credential form with browser automation. Native Admin authentication, role checks and credential staging remain in charge.

After the operator creates/scans the upstream, ask for its selected ID only. Discover `upstreams.get`, `upstream.candidates` and `editions.list`, then read their contracts and sanitized results. Use `upstreams.list` only when discovery is needed; names are not selection IDs. Upstream and onboarding operations require explicit platform grants; older grants need reauthorization and model-scoped grants cannot use them. If the link or operations are unavailable, report the scope/version boundary and use native Admin or a prerequisite summary without credentials. Do not substitute another principal or invent an API.

## Import, configure, certify and approve

Discover/details each needed operation before using it:

1. **Import — `upstream.import`**: select discovered, unimported candidate UUIDs. Each item chooses exactly one existing API-model mapping or `createDraft`. For a new draft collect its stable public ID, display name, developer label (the native `provider` field), context limit when needed, and all three customer prices in JPY per million tokens. Collect RPM/TPM limits too. Provider USD cost references are separate from customer JPY prices. Never convert currencies implicitly, invent prices, set zero as a placeholder, confuse provider cost with selling price, or silently map to a live model. Skip already imported candidates after checking their recorded IDs/state.
2. **Configure — `edition.draft-spec.update`**: set capabilities, endpoint families, context limit and maximum output from trusted specifications. Research official sources for public models; ask the operator for private IDC model specifications. Do not infer capabilities from a name or invent conservative defaults. This ordinary draft write executes immediately under an Operator-or-higher grant; the native handler permits draft editions only. Read back the specification through edition/upstream reads.
3. **Certify — `edition.certify`**: requires an Admin-role grant. Prepare the exact edition for human confirmation. Native certification checks nonempty capabilities and fresh active/healthy Jobs evidence. It does not prove response quality or benchmark performance and must not trigger an inference probe. Insufficient authority or stale health is a reported prerequisite, not permission to change credentials or bypass validation.
4. **Approve — `deployment.approve`**: requires Operator-or-higher authority and human confirmation. Use the imported deployment ID bound to the selected certified edition. Review the approval class from details; approval can affect existing live routing. Native approval has no expiry and is invalidated by relevant native lifecycle changes; do not invent a TTL.

Import, certification and deployment approval use `fr_admin_api_write` with `phase: prepare` and return an owner confirmation URL. The human opens/reviews/confirms it. Never automate that click. Inspect the same confirmation; `completed` alone means the attempt returned, so require its native outcome envelope to be successful. Wait for confirmation and read back state before dependent steps. Import queues Jobs work: read candidate/upstream state until the deployment is actually ready, without re-importing, retrying creates or preparing replacements merely because it is pending. Missing or uncertain effects require investigation, not another write.

After onboarding, check `edition_capabilities_set`, `edition_certified`, `deployment_active_healthy` and `deployment_approved` for the selected candidates. Continue the requested Direct/Policy work only when these prerequisites are satisfied. Import anchors do not need published tariffs/contracts or enabled access before a new API-model draft is made. Report exact candidate, edition, deployment and confirmation IDs plus remaining steps. Creating/scanning upstreams, key changes and credential recovery remain human-operated native Admin steps. IDC inference hosting remains outside FlashRouter.

## Model decisions

Read the existing model, editions and prerequisites. Ask only for missing product decisions: public calling name, display copy, Direct edition or Policy candidates/weights, and customer prices. Native creation supplies internal UUIDs. The public calling name is a stable customer contract. Create the draft disabled; do not enable it to make it visible in the catalog.

## Direct

Create a pinned API model using the selected edition. Prepare exact prices and wait for the native read to show their application before publishing the tariff. Derive/seal the contract, then prepare publication of the exact reviewed sealed contract ID. For `model.contract.publish`, supply `reviewedContractVersionId` and `reason` from details. Independent repricing of an enabled Direct model requires an explicit user decision to disable it first; do not disable it silently.

## Policy

A Policy model is an adaptive API model. Create it without a dummy edition. Save the candidate pool and routing policy together, read back revisions and health, then seal and read the immutable policy version. Launch requires explicit `routePolicyId` and `policyVersionId` reviewed together, plus intended prices/copy. Never resolve “latest” during execution or invent certification, cache behavior or upstream health.

## Writes and completion

Use `fr_admin_api_write` with `phase: prepare`. Ordinary draft commands execute immediately under the grant. Sensitive commands return a confirmation URL and expiry; the human owner reviews exact inputs and state in Admin and confirms there. Never click the confirmation for them or describe a pending action as executed.

Publishing preserves access state. Enable/disable is a separate decision and exact confirmation of an explicit `enabled` boolean. A request to publish does not authorize enabling.

Read back native state after a write; inspect sensitive confirmations with `phase: inspect`. Report what was applied, what awaits confirmation and what remains unknown, with exact version IDs. Launch can partially complete. Never automatically replay failed/unknown writes, mint a replacement confirmation to bypass a consumed one or claim a full rollback. Inspect model/routing state first. The existing single-publisher closed-beta limit remains.
