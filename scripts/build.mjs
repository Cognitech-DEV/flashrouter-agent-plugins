import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "..");
const version = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
).version;
const check = process.argv.includes("--check"),
  endpoint = "https://mcp.flash-router.co.jp/mcp";
const files = new Map();
const put = (p, v) =>
  files.set(p, typeof v === "string" ? v : JSON.stringify(v, null, 2) + "\n");
const entries = { codex: [], claude: [] };
for (const surface of ["console", "admin"]) {
  const name = "flash-router-" + surface;
  const display =
    "FlashRouter " + (surface === "console" ? "Console" : "Admin");
  const skills =
    surface === "console"
      ? ["flash-router-console-setup", "flash-router-workspace-inspection"]
      : [
          "flash-router-admin-setup",
          "flash-router-platform-inspection",
          "flash-router-model-studio",
        ];
  const description =
    surface === "console"
      ? "Read your workspace models, credits and usage."
      : "Inspect platform state and prepare Model Studio actions with separate human review.";
  const author = { name: "Cognitech" };
  const portable = "plugins/" + name,
    compat = "providers/codex/" + name,
    claude = "providers/claude-code/" + name;
  put(portable + "/plugin.json", {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name,
    version,
    description,
    author,
    license: "MIT",
    extensions: {
      "com.openai": {
        interface: {
          displayName: display,
          shortDescription: description,
          developerName: "Cognitech",
          category: "Developer Tools",
          brandColor: "#2855ce",
        },
        onboardingSkill: "./skills/flash-router-" + surface + "-setup/SKILL.md",
      },
    },
  });
  put(portable + "/mcp.json", {
    $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
    mcpServers: {
      flashrouter: {
        type: "streamable-http",
        url: endpoint,
        extensions: {
          "com.openai": {
            auth: {
              type: "oauth",
              client: { mode: "dcr" },
              defaultScopes: ["flashrouter:" + surface, "offline_access"],
            },
          },
        },
      },
    },
  });
  put(compat + "/.codex-plugin/plugin.json", {
    name,
    version,
    description,
    author,
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: display,
      shortDescription: description,
      developerName: "Cognitech",
      category: "Developer Tools",
      brandColor: "#2855ce",
    },
  });
  put(claude + "/.claude-plugin/plugin.json", {
    name,
    version,
    description,
    author,
    license: "MIT",
  });
  for (const dir of [compat, claude])
    put(dir + "/.mcp.json", {
      mcpServers: { flashrouter: { type: "http", url: endpoint } },
    });
  for (const skill of skills) {
    const data = readFileSync(
      path.join(root, "skills", skill, "SKILL.md"),
      "utf8",
    );
    for (const dir of [portable, compat, claude])
      put(dir + "/skills/" + skill + "/SKILL.md", data);
  }
  entries.codex.push({
    name,
    source: { source: "local", path: "./" + compat },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Developer Tools",
  });
  entries.claude.push({ name, source: "./" + claude, description, version });
}
put(".agents/plugins/marketplace.json", {
  name: "flash-router",
  interface: { displayName: "FlashRouter" },
  plugins: entries.codex,
});
put(".claude-plugin/marketplace.json", {
  name: "flash-router",
  owner: { name: "Cognitech" },
  plugins: entries.claude,
});
for (const [file, value] of files) {
  const p = path.join(root, file);
  if (check)
    assert.equal(
      readFileSync(p, "utf8"),
      value,
      "Generated package drift: " + file,
    );
  else {
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, value);
  }
}
console.log(
  (check ? "Verified" : "Built") +
    " portable, Codex and Claude Code packages (" +
    version +
    "); one hosted OAuth resource; no credentials.",
);
