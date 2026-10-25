import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { commands } from "../scripts/connect.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  read = (p) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
test("Git marketplace references resolve to self-contained plugins", () => {
  for (const p of read(".agents/plugins/marketplace.json").plugins) {
    const dir = p.source.path;
    assert.ok(!dir.includes(".."));
    const m = read(dir + "/.codex-plugin/plugin.json");
    for (const k of ["skills", "mcpServers"])
      assert.ok(existsSync(path.join(root, dir, m[k])));
    assert.ok(
      !existsSync(path.join(root, dir, "plugin.json")),
      "Avoid portable-root shadowing in compatibility packages",
    );
  }
});
test("Both surfaces declare one HTTPS resource and separate OAuth scopes", () => {
  for (const s of ["console", "admin"]) {
    const m = read("plugins/flash-router-" + s + "/mcp.json").mcpServers
      .flashrouter;
    assert.equal(m.url, "https://mcp.flash-router.co.jp/mcp");
    assert.deepEqual(m.extensions["com.openai"].auth.defaultScopes, [
      "flashrouter:" + s,
      "offline_access",
    ]);
    assert.ok(!("headers" in m));
  }
});
test("CLI compatibility config never asks for URL or bearer material", () => {
  for (const s of ["console", "admin"]) {
    const c = commands(s);
    assert.ok(c.some((a) => a[0] === "mcp" && a[1] === "login"));
    assert.ok(
      c.every((a) => !a.some((v) => /bearer|token-env|secret/i.test(v))),
    );
  }
  assert.throws(() => commands("root"));
});
