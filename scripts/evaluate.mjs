import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const cases = JSON.parse(
  readFileSync(new URL("../evals/admin.json", import.meta.url), "utf8"),
);

function payload(result) {
  if (!result || typeof result !== "object" || Array.isArray(result))
    return null;
  if (
    result.isError ||
    (typeof result.status === "number" && result.status >= 400)
  )
    return null;
  if (result.content) {
    try {
      return payload(
        JSON.parse(result.content.find((c) => c.type === "text").text),
      );
    } catch {
      return null;
    }
  }
  return result.error || result.envelope?.ok === false ? null : result;
}

const canonical = (v) =>
  JSON.stringify(v, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );

// Reject credential fields without including their values in the report. This is
// a bounded trace guard, not a secret detector for arbitrary free-form strings.
function hasCredentialField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasCredentialField);
  for (const [key, item] of Object.entries(value)) {
    if (
      /^(api[_-]?key|password|authorization|access[_-]?token|refresh[_-]?token|client[_-]?secret|encryptedCredential|credentialRef)$/i.test(
        key,
      )
    )
      return true;
    if (hasCredentialField(item)) return true;
    if (key === "content" && Array.isArray(item))
      for (const block of item) {
        if (block?.type !== "text" || typeof block.text !== "string") continue;
        try {
          if (hasCredentialField(JSON.parse(block.text))) return true;
        } catch {
          /* Non-JSON text is reviewed by the human evaluator. */
        }
      }
  }
  return false;
}

// A captured HTTP challenge can be normalized as { status: 401, headers: {...} }.
// This validates signaling only; actual native card rendering requires host QA.
function oauthChallenge(result) {
  const raw = result?.isError
    ? result?._meta?.["mcp/www_authenticate"]
    : result?.status === 401
      ? result.headers?.["www-authenticate"]
      : null;
  const values = Array.isArray(raw) ? raw : [raw];
  return values.some(
    (v) =>
      typeof v === "string" &&
      /^Bearer\s/.test(v) &&
      v.includes(
        'resource_metadata="https://mcp.flash-router.co.jp/.well-known/oauth-protected-resource/mcp"',
      ) &&
      /error="(?:invalid_token|insufficient_scope)"/.test(v) &&
      /error_description="[^"\r\n]+"/.test(v),
  );
}

// Checks a captured trace, not the model's interpretation or the server's security.
export function gradeTrace(task, trace) {
  if (!Array.isArray(trace?.calls)) throw new Error("Expected a calls array");
  const failures = [],
    seen = new Set(),
    discovered = new Set(),
    details = new Set();
  const confirmations = new Map(),
    confirmed = new Set();
  const reads = new Set(),
    writes = new Set(),
    attempts = new Set();
  const required = task.tools_triggered.split(/\s+/).filter(Boolean);
  const allowed = new Set(required);
  // Discovery may include details/read during an otherwise read-only investigation.
  if (required.length)
    for (const suffix of ["api_details", "api_read"])
      allowed.add("fr_admin_" + suffix);
  let profiled = false,
    searched = false,
    inspected = false,
    challenged = false,
    authorizationAttempts = 0,
    profileConnectionId = null;
  for (const call of trace.calls) {
    const tool = call.tool,
      args = call.arguments ?? {},
      value = payload(call.result);
    const op = args.operationKey;
    if (hasCredentialField(args) || hasCredentialField(call.result))
      failures.push("Credential field in tool arguments or result");
    if (!allowed.has(tool)) failures.push("Unexpected tool: " + tool);
    const challenge = oauthChallenge(call.result);
    challenged ||= challenge;
    if (value || (task.requireOAuthChallenge && challenge)) seen.add(tool);
    if (tool === "fr_admin_authorize") {
      if (++authorizationAttempts > 1)
        failures.push("Repeated authorization request");
      if (
        Object.keys(args).length !== 1 ||
        typeof args.connectionId !== "string" ||
        args.connectionId !== profileConnectionId
      )
        failures.push("Authorization requires only the profile connectionId");
      if (!challenge) failures.push("Missing native OAuth challenge");
    }
    if (tool === "fr_admin_profile") {
      profiled ||= Boolean(value);
      if (value) profileConnectionId = value.connectionId ?? null;
      continue;
    }
    if (!profiled)
      failures.push("Tool used before successful profile: " + tool);
    if (tool === "fr_admin_api_search") {
      searched ||= Boolean(value);
      for (const item of value?.operations ?? [])
        discovered.add(item.operationKey);
    } else if (tool === "fr_admin_api_details") {
      if (!searched || !discovered.has(op))
        failures.push("Undiscovered operation: " + op);
      if (value && discovered.has(op)) details.add(op);
    } else if (tool === "fr_admin_api_write" && args.phase === "inspect") {
      if (!args.confirmationId)
        failures.push("Inspect requires confirmationId");
      inspected ||= Boolean(value && args.confirmationId);
      const preparedOperation = confirmations.get(args.confirmationId);
      if (
        preparedOperation &&
        value?.id === args.confirmationId &&
        value.operationKey === preparedOperation &&
        value.state === "completed" &&
        value.outcome?.envelope?.ok === true
      )
        confirmed.add(preparedOperation);
    } else if (tool === "fr_admin_api_read" || tool === "fr_admin_api_write") {
      if (!details.has(op)) failures.push("Missing successful details: " + op);
      if (tool === "fr_admin_api_read") {
        if (value) reads.add(op);
      } else {
        if (args.phase !== "prepare") failures.push("Unexpected write phase");
        for (const prerequisite of task.requiredReadsBeforeWrite ?? [])
          if (!reads.has(prerequisite))
            failures.push(
              "Missing prerequisite read before write: " + prerequisite,
            );
        if (!(task.allowedWriteOperations ?? []).includes(op))
          failures.push("Write outside task: " + op);
        for (const prerequisite of task.confirmationDependencies?.[op] ?? [])
          if (!confirmed.has(prerequisite))
            failures.push(
              "Missing successful confirmation before write: " + prerequisite,
            );
        if ((task.requiredConfirmationOperations ?? []).includes(op) && value) {
          if (typeof value.confirmationId !== "string")
            failures.push("Missing owner confirmation preparation: " + op);
          else confirmations.set(value.confirmationId, op);
        }
        const signature = canonical(args);
        if (attempts.has(signature))
          failures.push("Repeated write attempt: " + op);
        attempts.add(signature);
        if (value) writes.add(op);
      }
    }
  }
  if (task.requireOAuthChallenge && !challenged)
    failures.push("Missing native OAuth challenge");
  for (const tool of required)
    if (!seen.has(tool)) failures.push("Missing successful tool: " + tool);
  for (const op of task.requiredReadOperations ?? [])
    if (!reads.has(op)) failures.push("Missing read: " + op);
  for (const op of task.requiredWriteOperations ?? [])
    if (!writes.has(op)) failures.push("Missing write: " + op);
  for (const op of task.requiredConfirmationOperations ?? [])
    if (!confirmed.has(op))
      failures.push("Missing successful native confirmation receipt: " + op);
  if (task.requireInspect && !inspected)
    failures.push("Missing confirmation inspection");
  return {
    caseId: task.id,
    tracePassed: failures.length === 0,
    failures,
    behaviorReview: task.expected_behavior,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const all = [...cases.positive, ...cases.negative];
  const [id, traceFile, ...extra] = process.argv.slice(2);
  if (id === "--list" && !traceFile) {
    for (const task of all) console.log(task.id + ": " + task.prompt);
  } else {
    const task = all.find((c) => c.id === id);
    if (!task || !traceFile || extra.length)
      throw new Error(
        "Usage: npm run eval -- <case-id> <trace.json>, or --list",
      );
    const report = gradeTrace(
      task,
      JSON.parse(readFileSync(traceFile, "utf8")),
    );
    console.log(
      JSON.stringify(
        {
          ...report,
          behaviorStatus:
            "Manual review required; trace success alone is not a behavioral pass.",
        },
        null,
        2,
      ),
    );
    if (!report.tracePassed) process.exitCode = 1;
  }
}
