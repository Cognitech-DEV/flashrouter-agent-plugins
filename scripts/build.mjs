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
  files.set(
    p,
    typeof v === "string" || Buffer.isBuffer(v)
      ? v
      : JSON.stringify(v, null, 2) + "\n",
  );
const entries = { codex: [], claude: [] };
const homepage = "https://flash-router.co.jp";
const repository = "https://github.com/Cognitech-DEV/flashrouter-agent-plugins";
const icon = readFileSync(path.join(root, "assets/flash-router-icon.png"));
const tasks = JSON.parse(
  readFileSync(path.join(root, "evals/admin.json"), "utf8"),
);
const reviewCases = Object.fromEntries(
  Object.entries(tasks).map(([kind, list]) => [
    kind,
    list.map(({ description, prompt, tools_triggered, expected_behavior }) => ({
      description,
      prompt,
      ...(kind === "positive" ? { tools_triggered, expected_behavior } : {}),
    })),
  ]),
);
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
      : "Build API models and investigate FlashRouter operations.";
  const author = { name: "Cognitech" };
  const keywords = [
    "flashrouter",
    "mcp",
    surface,
    ...(surface === "admin"
      ? ["model-studio", "sre", "routing"]
      : ["credits", "usage"]),
  ];
  const ui = {
    displayName: display,
    shortDescription: description,
    longDescription:
      surface === "console"
        ? "Read your workspace's published model catalog, credit balance and bounded usage through a read-only connection bound to current organization membership."
        : "Use the native Admin form for private upstream key entry, then import models, configure draft editions and prepare certification/deployment approvals before creating Direct and Policy API model drafts. Inspect model/routing state, alerts and releases, and investigate operational problems. Sensitive changes require owner confirmation. Read selected single-request model/version, attempt, charge and cost evidence through the native audited lookup, preserving unknown amounts and coverage. Request content, credentials and raw provider errors are excluded; general audit-event search is not exposed.",
    developerName: "Cognitech",
    category: "Developer Tools",
    websiteURL: homepage,
    supportURL: repository + "/issues",
    defaultPrompt:
      surface === "console"
        ? [
            "Which published models are available in my workspace?",
            "Show my credit balance.",
            "Summarize my usage over the last seven days.",
          ]
        : [
            "Help onboard my upstream models and create a disabled Direct or Policy draft.",
            "Check the publication and routing state of this API model.",
            "Investigate this request ID using historical model, charge and cost evidence.",
          ],
    brandColor: "#2855ce",
    composerIcon: "./assets/flash-router-icon.png",
    logo: "./assets/flash-router-icon.png",
  };
  const openai = {
    onboardingSkill: "./skills/flash-router-" + surface + "-setup/SKILL.md",
    ...(surface === "admin"
      ? {
          review: {
            test_cases: reviewCases,
            commerce: false,
            commerce_description:
              "This plugin does not sell products or process payments.",
          },
        }
      : {}),
    publication: {
      release_notes:
        surface === "admin"
          ? "Add native OAuth authorization and permission-review guidance; retain native key entry, read-only grant boundaries and separate sensitive-action confirmations."
          : "Add native OAuth authorization guidance for read-only workspace inspection and explicit permission review.",
    },
  };
  const portable = "plugins/" + name,
    compat = "providers/codex/" + name,
    claude = "providers/claude-code/" + name;
  put(portable + "/plugin.json", {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name,
    version,
    description,
    author,
    homepage,
    repository,
    keywords,
    license: "MIT",
    extensions: {
      "com.openai": {
        ...openai,
        interface: ui,
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
    homepage,
    repository,
    license: "MIT",
    keywords,
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: ui,
    extensions: { "com.openai": openai },
  });
  put(claude + "/.claude-plugin/plugin.json", {
    name,
    version,
    description,
    author,
    homepage,
    repository,
    license: "MIT",
    keywords,
  });
  for (const dir of [portable, compat])
    put(dir + "/assets/flash-router-icon.png", icon);
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
    assert.deepEqual(
      readFileSync(p),
      Buffer.from(value),
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
