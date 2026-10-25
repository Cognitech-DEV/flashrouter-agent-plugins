import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { cases, gradeTrace } from "../scripts/evaluate.mjs";

const task = (id) =>
  [...cases.positive, ...cases.negative].find((c) => c.id === id);
const call = (suffix, args = {}, result = {}) => ({
  tool: "fr_admin_" + suffix,
  arguments: args,
  result,
});
function traceFor(id) {
  const t = task(id);
  if (!t.tools_triggered) return { calls: [] };
  const ops = [
    ...new Set([
      ...(t.requiredWriteOperations ?? []),
      ...(t.requiredReadOperations ?? []),
    ]),
  ];
  return {
    calls: [
      call("profile"),
      call(
        "api_search",
        { query: "model" },
        { operations: ops.map((operationKey) => ({ operationKey })) },
      ),
      ...ops.map((operationKey) =>
        call("api_details", { operationKey }, { operationKey }),
      ),
      ...(t.requireInspect
        ? [
            call(
              "api_write",
              { phase: "inspect", confirmationId: "synthetic-confirmation" },
              { state: "unknown" },
            ),
          ]
        : []),
      ...(t.requiredReadsBeforeWrite ?? []).map((operationKey) =>
        call("api_read", { operationKey }),
      ),
      ...(t.requiredWriteOperations ?? []).flatMap((operationKey) => {
        const sensitive = (t.requiredConfirmationOperations ?? []).includes(
          operationKey,
        );
        const confirmationId = "synthetic-" + operationKey;
        return [
          call(
            "api_write",
            { phase: "prepare", operationKey, body: { fixture: true } },
            sensitive ? { confirmationId, state: "pending" } : {},
          ),
          ...(sensitive
            ? [
                call(
                  "api_write",
                  { phase: "inspect", confirmationId },
                  {
                    id: confirmationId,
                    operationKey,
                    state: "completed",
                    outcome: { envelope: { ok: true } },
                  },
                ),
              ]
            : []),
        ];
      }),
      ...(t.requiredReadOperations ?? [])
        .filter((op) => !(t.requiredReadsBeforeWrite ?? []).includes(op))
        .map((operationKey) => call("api_read", { operationKey })),
    ],
  };
}

test("all task baselines pass trace checks; behavior still requires review", () => {
  for (const t of [...cases.positive, ...cases.negative]) {
    const report = gradeTrace(t, traceFor(t.id));
    assert.deepEqual(report.failures, [], t.id);
    assert.equal(report.behaviorReview, t.expected_behavior);
  }
});

test("read-only and unrelated tasks reject mutations or unrelated tool calls", () => {
  for (const id of [
    "routing-check",
    "onboarding-blocked",
    "unknown-onboarding",
    "request-audit-gap",
    "request-evidence",
    "request-evidence-incomplete",
    "unknown-launch",
    "unrelated-react",
  ]) {
    const trace = traceFor(id);
    trace.calls.push(
      call("api_write", { phase: "prepare", operationKey: "model.launch" }),
    );
    assert.equal(gradeTrace(task(id), trace).tracePassed, false, id);
  }
  assert.equal(
    gradeTrace(task("unrelated-cluster"), { calls: [{ tool: "shell" }] })
      .tracePassed,
    false,
  );
});

test("discovery and successful details must precede a native operation", () => {
  const baseline = traceFor("direct-draft");
  for (const suffix of ["profile", "api_search", "api_details"]) {
    const trace = structuredClone(baseline);
    trace.calls = trace.calls.filter((c) => c.tool !== "fr_admin_" + suffix);
    assert.equal(
      gradeTrace(task("direct-draft"), trace).tracePassed,
      false,
      suffix,
    );
  }
  const denied = structuredClone(baseline);
  denied.calls.find((c) => c.tool === "fr_admin_api_details").result = {
    isError: true,
    content: [{ type: "text", text: '{"error":"agent_operation_forbidden"}' }],
  };
  assert.equal(gradeTrace(task("direct-draft"), denied).tracePassed, false);
});

test("reordered JSON fields cannot disguise a repeated write attempt", () => {
  const trace = traceFor("direct-draft");
  const first = trace.calls.find((c) => c.tool === "fr_admin_api_write");
  first.result = { error: "agent_outcome_unknown" };
  trace.calls.push({
    ...first,
    arguments: {
      body: first.arguments.body,
      operationKey: first.arguments.operationKey,
      phase: first.arguments.phase,
    },
  });
  assert.ok(
    gradeTrace(task("direct-draft"), trace).failures.some((f) =>
      f.startsWith("Repeated write attempt:"),
    ),
  );
});

test("confirmation inspection cannot satisfy a required draft write", () => {
  const trace = traceFor("direct-draft");
  trace.calls = trace.calls.map((c) =>
    c.tool === "fr_admin_api_write"
      ? call("api_write", {
          phase: "inspect",
          confirmationId: "synthetic-confirmation",
        })
      : c,
  );
  assert.equal(gradeTrace(task("direct-draft"), trace).tracePassed, false);
});

test("MCP text results work and native failure envelopes do not count as success", () => {
  const trace = traceFor("routing-check");
  for (const c of trace.calls)
    c.result = { content: [{ type: "text", text: JSON.stringify(c.result) }] };
  assert.equal(gradeTrace(task("routing-check"), trace).tracePassed, true);
  trace.calls.at(-1).result = { envelope: { ok: false } };
  assert.equal(gradeTrace(task("routing-check"), trace).tracePassed, false);
});

test("Admin review metadata is generated from the task cases in both formats", () => {
  const read = (file) =>
    JSON.parse(readFileSync(new URL("../" + file, import.meta.url), "utf8"));
  const portable = read("plugins/flash-router-admin/plugin.json");
  const compat = read(
    "providers/codex/flash-router-admin/.codex-plugin/plugin.json",
  );
  const { interface: ui, ...metadata } = portable.extensions["com.openai"];
  assert.deepEqual(compat.extensions["com.openai"], metadata);
  assert.deepEqual(compat.interface, ui);
  assert.equal(
    metadata.review.test_cases.positive.length,
    cases.positive.length,
  );
  assert.equal(metadata.review.test_cases.negative.length, 3);
  for (const kind of ["positive", "negative"])
    for (const [i, t] of metadata.review.test_cases[kind].entries()) {
      assert.equal(t.prompt, cases[kind][i].prompt);
      assert.equal("id" in t, false);
      assert.equal("allowedWriteOperations" in t, false);
    }
  const ids = [...cases.positive, ...cases.negative].map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of cases.positive)
    assert.ok(
      existsSync(
        new URL("../skills/" + t.skill + "/SKILL.md", import.meta.url),
      ),
    );
});

test("plugin presentation assets remain self-contained in each client package", () => {
  for (const surface of ["console", "admin"])
    for (const [dir, manifest] of [
      ["plugins/flash-router-" + surface, "plugin.json"],
      ["providers/codex/flash-router-" + surface, ".codex-plugin/plugin.json"],
    ]) {
      const m = JSON.parse(
        readFileSync(
          new URL("../" + dir + "/" + manifest, import.meta.url),
          "utf8",
        ),
      );
      const ui = m.interface ?? m.extensions["com.openai"].interface;
      assert.ok(ui.defaultPrompt.length > 0);
      for (const asset of [ui.logo, ui.composerIcon]) {
        assert.ok(asset.startsWith("./assets/") && !asset.includes(".."));
        assert.deepEqual(
          readFileSync(new URL("../" + dir + "/" + asset, import.meta.url)),
          readFileSync(
            new URL("../assets/flash-router-icon.png", import.meta.url),
          ),
        );
      }
    }
});

test("upstream results must be read before drafting, not only afterward", () => {
  const trace = traceFor("direct-draft");
  const prerequisites = trace.calls.filter(
    (c) =>
      c.tool === "fr_admin_api_read" &&
      task("direct-draft").requiredReadsBeforeWrite.includes(
        c.arguments.operationKey,
      ),
  );
  trace.calls = trace.calls.filter((c) => !prerequisites.includes(c));
  trace.calls.push(...prerequisites);
  assert.ok(
    gradeTrace(task("direct-draft"), trace).failures.some((f) =>
      f.startsWith("Missing prerequisite read before write:"),
    ),
  );
});

test("credential fields in arguments or nested MCP results fail without echoing values", () => {
  const secret = "synthetic-secret-only";
  for (const field of [
    "apiKey",
    "api_key",
    "password",
    "authorization",
    "access_token",
    "refresh_token",
    "clientSecret",
    "credentialRef",
  ]) {
    for (const place of ["arguments", "result"]) {
      const trace = traceFor("direct-draft");
      const c = trace.calls.find((c) => c.tool === "fr_admin_api_read");
      if (place === "arguments") c.arguments.body = { [field]: secret };
      else
        c.result = {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                envelope: { result: { [field]: secret } },
              }),
            },
          ],
        };
      const report = gradeTrace(task("direct-draft"), trace);
      assert.equal(report.tracePassed, false, field + " in " + place);
      assert.ok(!JSON.stringify(report).includes(secret));
    }
  }
  const safe = traceFor("direct-draft");
  safe.calls.find((c) => c.tool === "fr_admin_api_read").result = {
    apiKeyId: "synthetic-id",
    credentialPresent: true,
    requiresApiKey: true,
  };
  assert.equal(gradeTrace(task("direct-draft"), safe).tracePassed, true);
});

test("request investigation requires the discovered native read and never a write", () => {
  for (const id of ["request-evidence", "request-evidence-incomplete"]) {
    const trace = traceFor(id);
    trace.calls = trace.calls.filter((c) => c.tool !== "fr_admin_api_read");
    assert.equal(gradeTrace(task(id), trace).tracePassed, false, id);
  }
});

test("onboarding needs successful native receipts before dependent writes", () => {
  for (const change of [
    "pending",
    "native refusal",
    "wrong operation",
    "wrong ID",
    "wrong receipt ID",
    "missing inspect",
  ]) {
    const trace = traceFor("model-onboarding");
    const c = trace.calls.find((c) => c.arguments.phase === "inspect");
    if (change === "pending") c.result.state = "pending";
    if (change === "native refusal") c.result.outcome.envelope.ok = false;
    if (change === "wrong operation") c.result.operationKey = "model.enable";
    if (change === "wrong ID")
      c.arguments.confirmationId = "another-confirmation";
    if (change === "wrong receipt ID") c.result.id = "another-confirmation";
    if (change === "missing inspect")
      trace.calls = trace.calls.filter((c) => c.arguments.phase !== "inspect");
    const report = gradeTrace(task("model-onboarding"), trace);
    assert.equal(report.tracePassed, false, change);
    assert.ok(
      report.failures.some((f) =>
        f.startsWith("Missing successful native confirmation receipt:"),
      ),
    );
  }
});

test("an immediate result cannot stand in for human-confirmed onboarding", () => {
  const trace = traceFor("model-onboarding");
  const c = trace.calls.find(
    (c) =>
      c.arguments.operationKey === "upstream.import" &&
      c.arguments.phase === "prepare",
  );
  c.result = { envelope: { ok: true } };
  assert.ok(
    gradeTrace(task("model-onboarding"), trace).failures.some((f) =>
      f.startsWith("Missing owner confirmation preparation:"),
    ),
  );
});
