// Optional Codex CLI compatibility: all host configuration is delegated to Codex.
// No token, client secret, browser cookie or credential file is read here.
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
export function commands(surface) {
  assert.ok(["console", "admin"].includes(surface), "Choose console or admin");
  const name = "flash-router-" + surface;
  return [
    ["plugin", "marketplace", "add", "Cognitech-DEV/flashrouter-agent-plugins"],
    ["plugin", "add", name + "@flash-router"],
    ["mcp", "add", name, "--url", "https://mcp.flash-router.co.jp/mcp"],
    [
      "mcp",
      "login",
      name,
      "--scopes",
      "flashrouter:" + surface + ",offline_access",
      "--oauth-client-registration",
      "dcr",
    ],
  ];
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [surface, ...extra] = process.argv.slice(2);
  assert.equal(
    extra.length,
    0,
    "Usage: node scripts/connect.mjs console|admin",
  );
  const steps = commands(surface);
  const check = spawnSync(
    "codex",
    ["mcp", "get", "flash-router-" + surface, "--json"],
    { encoding: "utf8" },
  );
  if (check.status === 0) {
    const existing = JSON.parse(check.stdout);
    const transport = existing.transport ?? existing;
    assert.equal(
      transport.url,
      "https://mcp.flash-router.co.jp/mcp",
      "Existing connection has another endpoint; no configuration changed",
    );
    assert.ok(
      !transport.bearer_token_env_var &&
        !transport.http_headers &&
        !transport.env_http_headers,
      "Existing connection has custom authentication; no configuration changed",
    );
  }
  for (const args of steps) {
    if (check.status === 0 && args[0] === "mcp" && args[1] === "add") continue;
    const r = spawnSync("codex", args, { stdio: "inherit" });
    if (r.error) throw r.error;
    if (r.status !== 0) {
      process.exitCode = r.status ?? 1;
      break;
    }
  }
}
