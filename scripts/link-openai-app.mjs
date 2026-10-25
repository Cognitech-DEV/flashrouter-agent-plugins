import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
// A local packaging overlay for an already-registered App, not App registration.
export function linkOpenAIApp(surface, appId, output) {
  if (!["admin", "console"].includes(surface))
    throw new Error("Choose admin or console");
  if (
    typeof appId !== "string" ||
    !/^(?:plugin_)?asdk_app_[A-Za-z0-9]{1,100}$/.test(appId)
  )
    throw new Error(
      "Use the actual registered OpenAI App technical ID, never a token or URL",
    );
  if (!output)
    throw new Error(
      "Choose a new output directory outside the public repository",
    );
  const destination = path.resolve(output);
  const parent = realpathSync(path.dirname(destination));
  const resolved = path.join(parent, path.basename(destination));
  const relative = path.relative(realpathSync(root), resolved);
  if (
    !relative ||
    (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative))
  )
    throw new Error("Keep private App mappings outside the public repository");
  if (existsSync(destination))
    throw new Error(
      "Output already exists; existing plugins are never overwritten",
    );
  const name = "flash-router-" + surface;
  const source = path.join(root, "providers/codex", name);
  const manifest = JSON.parse(
    readFileSync(path.join(source, ".codex-plugin/plugin.json"), "utf8"),
  );
  delete manifest.mcpServers; // The registered App supplies tools; avoid two transports.
  manifest.apps = "./.app.json";
  const plugin = path.join(destination, "plugins", name);
  cpSync(source, plugin, { recursive: true, errorOnExist: true, force: false });
  rmSync(path.join(plugin, ".mcp.json"));
  const write = (file, value) =>
    writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  write(path.join(plugin, ".codex-plugin/plugin.json"), manifest);
  write(path.join(plugin, ".app.json"), {
    apps: { flashrouter: { id: appId, required: true } },
  });
  const marketplace = path.join(destination, ".agents/plugins");
  mkdirSync(marketplace, { recursive: true });
  write(path.join(marketplace, "marketplace.json"), {
    name: "flash-router-openai-local",
    interface: { displayName: "FlashRouter · registered App test" },
    plugins: [
      {
        name,
        source: { source: "local", path: "./plugins/" + name },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Developer Tools",
      },
    ],
  });
  return {
    directory: destination,
    marketplace: "flash-router-openai-local",
    plugin: name,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [surface, appId, output, ...extra] = process.argv.slice(2);
  if (extra.length)
    throw new Error(
      "Usage: node scripts/link-openai-app.mjs <admin|console> <registered-app-id> <new-output-directory>",
    );
  console.log(JSON.stringify(linkOpenAIApp(surface, appId, output), null, 2));
}
