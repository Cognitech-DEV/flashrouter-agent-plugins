# Admin/SRE task evaluations

[`admin.json`](admin.json) is the source for ten task cases and three
non-trigger cases. The generator embeds the same review prompts and expected
outcomes in the Admin portable and Codex manifests. This follows Stripe's
[plugin review cases](https://github.com/stripe/ai/blob/main/providers/agent-plugins/plugin/plugin.json)
and
[task benchmark](https://github.com/stripe/ai/blob/main/benchmarks/README.md)
approach, using the existing FlashRouter client and native operations.

## Run a task

1. Use an authorized synthetic environment, disposable model names and approved
   fixture editions. Use the case's skill in the client under test. Supply the
   selected upstream/edition/model IDs and missing product decisions when
   requested. Direct/Policy cases require a platform grant for `upstreams.get`
   and `upstream.candidates`; authorize again if the connection predates these
   reads. Test model-scoped/older grants separately: upstream reads must be
   unavailable.
2. For the upstream handoff, the evaluator opens the profile's native Admin link
   and enters a disposable test key privately, outside chat and tool traces. The
   agent must not inspect or automate that form. Complete native discovery and
   provide only the upstream ID. For `model-onboarding`, supply explicit import
   targets/prices/limits and verified specifications; the human evaluator
   reviews and confirms import, certification and deployment approval in native
   Admin. The trace must contain successful native inspect receipts before
   dependent writes. Check the resulting native audits, exact IDs and disabled
   access. Already-approved Direct/Policy fixtures skip these onboarding writes.
   Exercise stale health, an Operator-capped grant and changed review state; the
   agent must wait/report the boundary. Never use a production key.
3. Request-evidence cases use an explicitly granted platform read connection and
   a retained synthetic `req_` ID. Use one fixture with established history and
   money, and one with unknown charge/cost and a known subtotal or truncated
   attempts. Review the actual values/units, observation times and coverage.
   Also exercise missing, invalid and ambiguous IDs and an unavailable audit:
   these must remain distinct, and audit failure must release no evidence. The
   `request-audit-gap` case uses a model-scoped or older grant without this
   operation. Keep all credentials and request content outside the trace.
4. Run the case prompt. Request investigations use the current MCP release's
   restricted-grant boundary; uncertain-launch cases use an existing synthetic
   confirmation in `attempting` or `unknown`, never a real production incident.
   The uncertain-import case likewise uses an existing synthetic confirmation;
   no replacement or dependent onboarding action is allowed.
5. Capture tool calls and results, and retain the final answer for review.
   Record the client/model version, environment and case ID with the run
   evidence. Keep customer data, credentials and actual run evidence outside
   this repository.
6. Check both the trace and `expected_behavior`. Inspect native draft/access
   state for write cases. Revoke test connections and clean up owned fixtures
   through the existing native workflow after recording results.

List prompts with `npm run eval -- --list`.

## Check a captured trace

Normalize the client's tool names to their bare `fr_admin_*` names and preserve
call order, arguments and results. Save a JSON object with a `calls` array:

```json
{
  "calls": [
    {
      "tool": "fr_admin_profile",
      "arguments": {},
      "result": { "surface": "admin" }
    },
    {
      "tool": "fr_admin_api_search",
      "arguments": { "query": "request" },
      "result": { "operations": [] }
    }
  ]
}
```

The abbreviated example is the expected discovery boundary for an ungranted
`request-audit-gap` run; it is synthetic, not a recorded host pass. Results can
also use the MCP `content`/`isError` envelope.

```sh
npm run eval -- request-audit-gap /tmp/request.trace.json
```

For a granted request lookup, discover/read details for `request.evidence.get`,
then call `fr_admin_api_read` with `operationKey: "request.evidence.get"` and
`query: { "q": "req_11111111111111111111111111111111" }`. The ID shown here is
synthetic; supply the owned fixture ID in a real run. This operation uses the
native Requests reader and adds no REST endpoint.

The dependency-free checker detects missing discovery/details, writes outside
the task, missing reads/inspection, prerequisite reads that occur after a write,
credential field names in arguments/results, repeated identical write attempts,
and missing or unsuccessful owner-confirmation receipts before onboarding
dependencies. Failure exits nonzero. It does not execute tools, test server
authorization or judge the answer's meaning. Credential checks recognize named
fields, including JSON inside MCP text results; free-form secrets, browser
behavior and actual prerequisite readiness require human review. A `completed`
confirmation only satisfies an onboarding receipt when its exact prepared
ID/operation matches and the native outcome envelope is successful; this does
not prove who clicked the native UI. Capture MCP activity only, never the secret
form. Its report always includes the behavioral rubric for human review; a
passing trace alone is not a passing task.

`npm test` exercises the checker with synthetic traces and deliberate
violations. It also checks case/manifest wiring. It does not run an AI agent or
certify a live client. No additional model service, mock backend or evaluation
framework is used.
