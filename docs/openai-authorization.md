# Native OpenAI authorization

For an existing direct MCP connection, use the client’s **Authenticate/Connect**
action when needed; no registered App ID is required for that OAuth login. The
optional registration and packaging steps below are for testing the registered
App path. Follow [the client MCP guide](https://learn.chatgpt.com/docs/extend/mcp)
for direct connections.

The intended experience is: request a FlashRouter task → see the client's native
**Authorize** card → sign in/review permissions in FlashRouter → return to the
same chat → verify the new profile and continue the authorized task.

## Reuse the existing registration

First open the existing FlashRouter entry in your OpenAI client's Plugins/Apps
settings. If it already has a registered technical ID, reuse it. A named MCP
connection and a registered App are separate records; do not recreate or revoke
a working connection just to troubleshoot the card.

If registration is missing, use [ChatGPT Plugins](https://chatgpt.com/plugins) →
**Add custom MCP server**, with `https://mcp.flash-router.co.jp/mcp` and OAuth.
The server supports public-client dynamic registration and PKCE; never invent a
client secret or paste a FlashRouter API key. For Admin request
`flashrouter:admin offline_access`; for Console request
`flashrouter:console offline_access` when the form supports explicit scopes.
The existing native selector handles a client requesting both surfaces.

The person completes native login and consent. **Create as a plugin** produces
a real technical ID, documented with the `plugin_asdk_app…` prefix. Copy only
that ID from the details URL. Do not copy Stripe's ID or an OAuth token. Private
testing does not require public-directory submission; account/workspace policy
and client support still apply.

## Associate the registered App locally

The public Git packages retain direct MCP configuration for Codex CLI and other
clients. A private registered App ID is not a universal public dependency.
With `REGISTERED_APP_ID` set to the actual ID, create a separate local test
package in a new directory outside this repository:

```sh
node scripts/link-openai-app.mjs admin "$REGISTERED_APP_ID" /tmp/flash-router-admin-app-test
codex plugin marketplace add /tmp/flash-router-admin-app-test
codex plugin add flash-router-admin@flash-router-openai-local
```

Use `console` for the Console variant. Test the App variant in a separate client
profile or disable the direct-MCP variant first to avoid duplicate skills/tools.
The helper writes `.app.json` and the manifest's `apps` association, reuses the
existing skills/assets and removes direct MCP transport from that test package.
It refuses to overwrite an existing output or store private mappings in the
public repository. It does not register, install, authenticate or change account
permissions itself. The commands shown install the generated local marketplace.

An App ID alone does not establish its server, available tools, delegated scope
or workspace visibility; verify those using the actual connection profile.

## Server behavior

The matching backend declares OAuth `securitySchemes` on each tool. Missing or
expired credentials receive a canonical `WWW-Authenticate` challenge. A token
that becomes invalid during tool execution receives the same challenge under
`_meta["mcp/www_authenticate"]`. The unified ingress preserves Admin challenges;
auth-service outages remain unavailable errors rather than login prompts.

For a requested task outside the current grant, the agent calls
`fr_admin_authorize` (or `fr_console_authorize`) with only the current profile's
nonsecret `connectionId`. The tool returns an `insufficient_scope` challenge.
The owner reviews the existing native consent form; only their existing native
authority can be delegated. A host retry carrying that previous ID returns the
new profile after consent, avoiding another challenge. If permission remains
insufficient or the person cancels, stop dependent work; do not loop.

Readonly grants still hide business write tools. Unknown operations, denied
resources and malformed arguments remain denials, not automatic permission
requests. Sensitive-action confirmations and human-only upstream key entry are
unchanged. No new secret store, callback record or authorization service exists.

## Host acceptance

Use a synthetic account and the matching deployed MCP build:

| Scenario                                    | Expected observation                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| No authorization                            | Profile/connection request produces a native Authorize card; no account evidence is released.                              |
| Token expired/revoked                       | Native linking is requested again; a backend outage is reported separately.                                                |
| Viewer needs a draft                        | Profile/discovery establishes the boundary; the authorization tool requests native consent and performs no business write. |
| Consent grants permitted Operator authority | Return to the same chat, verify the new profile, rediscover tools and continue only the requested work.                    |
| Viewer selected again / consent cancelled   | No dependent write, no repeated authorization loop.                                                                        |
| Sensitive action or upstream key needed     | Human uses the existing native confirmation or credential form; OAuth consent substitutes for neither.                     |

Keep host evidence separately from dependency-free packaging/trace tests. The
offline suite verifies signals and boundaries; it cannot prove a native card
rendered, that a person clicked consent, or that every Codex build supports it.
This change has no recorded desktop-card acceptance yet and does not deploy the
backend or publish a public directory entry.

Official references: [authentication UI](https://developers.openai.com/plugins/build/auth#triggering-authentication-ui),
[registered App packaging](https://developers.openai.com/plugins/build/plugins#create-and-test-a-plugin-locally-with-an-mcp-server),
[private use and public review](https://developers.openai.com/plugins/deploy/app-review).
