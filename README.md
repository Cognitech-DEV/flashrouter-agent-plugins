# FlashRouter agent plugins

Client-neutral skills and OAuth MCP connection packages for FlashRouter.
Install the Console package to inspect a workspace, or the Admin package for
platform checks and Model Studio. Both use **https://mcp.flash-router.co.jp/mcp**.
This repository contains client-side instructions and connection manifests.
The hosted MCP server and business backend are operated separately.

The service is in closed beta. Installation does not create a FlashRouter
account or grant platform permissions. A native authorized account is required.

## Install in Codex

```sh
codex plugin marketplace add Cognitech-DEV/flashrouter-agent-plugins
codex plugin add flash-router-console@flash-router
# Platform operators may additionally install:
codex plugin add flash-router-admin@flash-router
```

Connect/sign in when your host prompts you. It opens FlashRouter in the browser
for native sign-in and explicit scope review. No URL entry or copied Token is
part of this flow. An MCP-capable host with OAuth code/S256 and dynamic client
registration is required. Refresh/restart the host if newly installed tools
are not loaded in an existing conversation.

For Codex CLI versions that need a named connection to start browser OAuth,
clone this public repository and run the small compatibility helper:

```sh
git clone https://github.com/Cognitech-DEV/flashrouter-agent-plugins.git
cd flashrouter-agent-plugins
node scripts/connect.mjs console
# Or: node scripts/connect.mjs admin
```

It invokes official Codex plugin/MCP commands with the preset endpoint and
separate surface scope. Codex owns credential storage; this helper never reads
an account password, access token or credential file. It refuses to replace a
connection configured for a different endpoint or custom authentication.

## Install in Claude Code

```text
/plugin marketplace add Cognitech-DEV/flashrouter-agent-plugins
/plugin install flash-router-console@flash-router
/plugin install flash-router-admin@flash-router
```

Use `/mcp` to connect and authorize the required package. The repository
includes a native Claude Code marketplace and self-contained HTTP manifests.

## Portable packages and other clients

`plugins/flash-router-console` and `plugins/flash-router-admin` contain standard
root `plugin.json`, `mcp.json` and skills. Use these directories in clients that
support portable Agent Plugins. Other MCP clients can use the same hosted URL;
their UI should initiate OAuth. The standalone `skills/` directory provides the
same guidance where a host handles its connection separately. Host directory
submission and certification are separate from publishing this Git repository.

## What each part does

| Part              | Responsibility                                                     |
| ----------------- | ------------------------------------------------------------------ |
| Plugin            | Installable bundle of skills, connection metadata and presentation |
| Skill             | Explain how to discover APIs, interpret facts and recover safely   |
| Connector         | Configure the host connection and start native OAuth               |
| Hosted MCP server | Expose tools and enforce authorization before native APIs          |

Console initially exposes the published catalog, workspace balance and bounded
usage reads. It is bound to the current full organization membership. Admin
requires its own active platform role and defaults to read-only; Model Studio
writes can be explicitly delegated within a role cap and selected-model scope.
New operations or changed contracts require a new authorization ceiling.

Publication and customer access are separate decisions. Sensitive writes return
an exact-action review in the trusted Admin UI; the human confirms it. Preparing
an action does not execute it. Unknown outcomes require native state inspection,
never automatic write replay. The skills grant no additional authority.

Manage and revoke authorizations in FlashRouter **Settings → Agent connections**.
The list records authorized clients, permissions, expiry and last use, not an
invented online status. Do not put secrets, API keys or customer data in GitHub
issues or skill files. This public package has no inference/payment tool, local
database, proxy backend or embedded credential.

## Maintain and validate

Requires Node.js 22 or later. There are no package dependencies.

```sh
npm run build
npm run check
npm test
```

`skills/` owns guidance; `scripts/build.mjs` produces portable, Codex and Claude
packages and marketplace indexes. Check mode refuses generated drift. Public
Git installation is distinct from a registered ChatGPT/Claude connector listing;
no invented app IDs or marketplace approval claims are included.

References: [Stripe agent architecture](https://docs.stripe.com/agents),
[MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization),
[OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins).
