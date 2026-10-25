# FlashRouter agent plugins

Create Direct or Policy API model drafts and investigate FlashRouter operations
from your AI client. Includes Admin/SRE workflows and a read-only Console
plugin.

[Choose a plugin](#choose-a-plugin) · [Install](#install) · [Try it](#try-it) ·
[Task evaluations](evals/README.md) · [Development](#development)

> **Closed beta.** You need an existing, authorized FlashRouter account. Service
> availability depends on the closed-beta deployment.

## Choose a plugin

| Plugin                               | For                         | Capabilities                                                                             |
| ------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------- |
| **Admin** · `flash-router-admin`     | Platform operators and SREs | Model onboarding, Direct/Policy drafts, routing checks and single-request investigation. |
| **Console** · `flash-router-console` | Workspace members           | Published models, credit balance and usage reads.                                        |

Console is read-only and bound to your current full organization membership.
Admin requires an active platform role and defaults to read-only; write access
must be explicitly delegated for the permitted operations and model scope.
Install either plugin, or both if you use both surfaces.

## Install

### Codex

```sh
codex plugin marketplace add Cognitech-DEV/flashrouter-agent-plugins
codex plugin add flash-router-admin@flash-router
```

For workspace reads, use `codex plugin add flash-router-console@flash-router`.

### Claude Code

```text
/plugin marketplace add Cognitech-DEV/flashrouter-agent-plugins
/plugin install flash-router-admin@flash-router
```

For workspace reads, use `/plugin install flash-router-console@flash-router`.
Open `/mcp` to connect and authorize the plugin.

### Connect your account

Use your client's **Connect** or sign-in action. FlashRouter opens in the
browser for native sign-in and permission review. Review the workspace or model
scope, requested operations and expiry, then authorize the connection. You do
not need to enter a server address or copy a token.

Both plugins use `https://mcp.flash-router.co.jp/mcp`. If Codex needs a named
connection to start OAuth, use the [compatibility helper](#troubleshooting).

### Other clients

Clients supporting portable Agent Plugins can use the
[Console package](plugins/flash-router-console) or
[Admin package](plugins/flash-router-admin). Other MCP clients can connect to
the same hosted address through OAuth Authorization Code with PKCE S256 and
dynamic client registration.

Git installation and registration in a client's hosted connector directory are
separate. Support and certification depend on the client.

## Try it

After connecting, try a request for the plugin you authorized:

| Workflow                                                                  | Example request                                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Model onboarding](skills/flash-router-model-studio/SKILL.md)             | "Import these discovered models, configure their editions, and prepare certification and deployment approval." |
| [Direct model](skills/flash-router-model-studio/SKILL.md)                 | "Create a disabled Direct draft using this model edition."                                                     |
| [Policy model](skills/flash-router-model-studio/SKILL.md)                 | "Draft a Policy model with these two editions and weights of 70/30."                                           |
| [System check](skills/flash-router-platform-inspection/SKILL.md)          | "Check this API model's publication, enabled access and live routing state."                                   |
| [Request investigation](skills/flash-router-platform-inspection/SKILL.md) | "Help audit this request and identify which evidence is available."                                            |
| Console                                                                   | "Show my credit balance and summarize usage over the last seven days."                                         |

The agent discovers operations available to your connection. Installing a skill
does not grant permissions, and a catalog listing does not guarantee that every
API key can call that model.

For a single request, the Admin plugin can read selected historical model,
policy/tariff, attempt, charge and provider-cost evidence by FlashRouter request
ID. This uses the native retained seven-day lookup and mandatory read audit.
Credentials, request/response content, raw traces and provider errors are
excluded. Unknown amounts and partial coverage stay explicit; a cost subtotal is
not total cost or profit.

Request evidence requires the matching backend and fresh explicit platform
consent. Model-scoped or older grants cannot use it. Missing/ambiguous IDs are
reported separately from query/audit failure. General audit-event search and
request repair remain outside this operation; native **Requests** is the
fallback when the connection lacks the read.

## Connect an upstream securely

1. Ask the Admin plugin to connect an upstream. It provides the native Admin
   **Upstreams** link returned by your connection profile.
2. Open it in your own browser, sign in and fill in the existing form. Enter the
   provider API key there only. Do not send the key in chat or give it to an
   agent to type into the page.
3. Complete native discovery and return the selected upstream ID to the chat.
4. The plugin reads the candidates, collects import choices, customer prices,
   RPM/TPM limits and verified model specifications, then imports models,
   configures draft editions, certifies them and approves their deployments.
5. Review and confirm import, certification and deployment approval through the
   existing native confirmation links. The agent waits and reads back each
   result before continuing the requested disabled Direct/Policy draft.

This requires the matching hosted backend and explicit platform grants for the
required reads/writes. Draft edition specification edits require Operator or
higher; certification requires Admin; import and deployment approval require
Operator or higher plus owner confirmation. Older connections need fresh
authorization; a model-scoped connection cannot perform onboarding. If the
required operations are unavailable, the agent reports the limitation and uses a
native prerequisite summary supplied without credentials. Opening a link does
not submit the form. Import queues background work and does not establish
healthy routing immediately. Approval can affect existing live routes; API-model
publication and customer access remain separate decisions. Uncertain writes are
inspected, never replayed.

Running vLLM or SGLang in your IDC? Follow the
[self-hosted upstream guide](docs/self-hosted-upstreams.md) for serving, HTTPS,
network access and the exact Admin fields. FlashRouter does not operate your
inference servers.

## Permissions and approvals

- **Draft edits** can execute immediately when included in your delegated grant.
- **Sensitive actions** return a confirmation link. You review the exact action
  in FlashRouter Admin and confirm it yourself.
- **Publication and customer access** are separate decisions. Publishing a model
  does not enable access automatically.
- **Uncertain results** require checking the confirmation and native model state
  before recovery. Writes are never automatically replayed.

Manage permissions, expiry and revocation in **Settings → Agent connections**.
New operations or changed contracts require fresh authorization.

These packages expose no inference, payment, credit-adjustment or
credential-writing tools. Keys stay in the native Admin credential flow and out
of MCP inputs/results. Keep credentials and customer data out of issues and
skill files; see [Security](SECURITY.md) for reporting guidance.

## Troubleshooting

If newly installed tools are missing, refresh or restart your client. If your
authorization expires or your membership changes, connect and authorize again.

<details>
<summary>Codex CLI: start OAuth with the compatibility helper</summary>

Requires Node.js 22 or later and Codex CLI.

```sh
git clone https://github.com/Cognitech-DEV/flashrouter-agent-plugins.git
cd flashrouter-agent-plugins
node scripts/connect.mjs admin
# For Console: node scripts/connect.mjs console
```

The helper runs official Codex plugin and MCP commands with the preset endpoint
and surface scope. Codex stores the credentials. The helper never reads
passwords, tokens or credential files, and refuses to replace a connection
configured for another endpoint or custom authentication.

</details>

## Development

Requires Node.js 22 or later. There are no package dependencies.

```sh
npm run build
npm run check
npm test
```

Edit [`skills/`](skills) for workflows, [`evals/admin.json`](evals/admin.json)
for task cases, and [`scripts/build.mjs`](scripts/build.mjs) for
packaging/metadata. The generator produces portable, Codex and Claude Code
packages from these sources and the shared brand asset. Check mode detects
generated drift.

[Task evaluations](evals/README.md) reuse the existing client and native
synthetic environment. `npm test` checks packaging and the offline trace
checker; real-agent results and final-answer quality require a separate recorded
task run.

This repository contains client-side instructions and connection manifests. The
hosted MCP server and business backend are operated separately.

MIT licensed. See [LICENSE](LICENSE).
