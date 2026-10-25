import { readFileSync, readdirSync, lstatSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "..");
const forbidden = [
  /\b(?:sk|rk)_(?:live|test)_[a-zA-Z0-9]{12,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bfr_(?:oat|ort|amg|cmg)_[A-Za-z0-9_.-]{24,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
let count = 0;
function walk(dir) {
  for (const d of readdirSync(dir)) {
    if ([".git", "node_modules"].includes(d)) continue;
    const p = path.join(dir, d),
      s = lstatSync(p);
    assert.ok(!s.isSymbolicLink(), "No symlinks in install packages");
    if (s.isDirectory()) {
      assert.ok(
        ![".data", ".local", "secrets", "backups"].includes(d),
        "Private runtime directory in public package",
      );
      walk(p);
    } else {
      assert.ok(
        !/^\.env(?:\.|$)|\.(?:pem|key)$/.test(d),
        "Credential-bearing file type",
      );
      const text = readFileSync(p, "utf8");
      assert.ok(
        !/\/Users\/[a-zA-Z0-9._-]+\//.test(text) &&
          !/\/root\/[a-zA-Z0-9._-]+\//.test(text),
        "Private absolute path: " + path.relative(root, p),
      );
      for (const re of forbidden)
        assert.ok(
          !re.test(text),
          "Credential-shaped value; report path only: " +
            path.relative(root, p),
        );
      if (d.endsWith(".json")) JSON.parse(text);
      count++;
    }
  }
}
walk(root);
console.log(
  "Checked " +
    count +
    " public files: manifests parse and no runtime/private-key material is present.",
);
