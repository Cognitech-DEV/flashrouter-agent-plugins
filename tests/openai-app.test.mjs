import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { linkOpenAIApp } from "../scripts/link-openai-app.mjs";
const root = path.resolve(import.meta.dirname, "..");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
test("registered App overlays use the exact supplied ID with one tool transport and the existing skills", () => {
  const temporary = mkdtempSync(
    path.join(os.tmpdir(), "flash-router-app-test-"),
  );
  try {
    for (const surface of ["admin", "console"]) {
      const output = path.join(temporary, surface);
      const appId = "plugin_asdk_app_syntheticTest";
      const result = linkOpenAIApp(surface, appId, output);
      const entry = json(path.join(output, ".agents/plugins/marketplace.json"))
        .plugins[0];
      const plugin = path.resolve(output, entry.source.path);
      const manifest = json(path.join(plugin, ".codex-plugin/plugin.json"));
      assert.equal(result.plugin, "flash-router-" + surface);
      assert.equal(manifest.apps, "./.app.json");
      assert.equal(manifest.mcpServers, undefined);
      assert.equal(existsSync(path.join(plugin, ".mcp.json")), false);
      assert.equal(
        json(path.join(plugin, ".app.json")).apps.flashrouter.id,
        appId,
      );
      const skill = "skills/flash-router-" + surface + "-setup/SKILL.md";
      assert.equal(
        readFileSync(path.join(plugin, skill), "utf8"),
        readFileSync(path.join(root, skill), "utf8"),
      );
      assert.throws(
        () => linkOpenAIApp(surface, appId, output),
        /already exists/,
      );
    }
    assert.throws(
      () =>
        linkOpenAIApp("admin", "not-an-app-id", path.join(temporary, "bad")),
      /technical ID/,
    );
    assert.throws(
      () =>
        linkOpenAIApp(
          "admin",
          "asdk_app_syntheticTest",
          path.join(root, "private-app"),
        ),
      /outside the public/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
