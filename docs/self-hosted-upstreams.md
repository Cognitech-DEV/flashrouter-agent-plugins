# Connect an IDC-hosted model

Run vLLM or SGLang as an OpenAI-compatible upstream. You operate the inference
server, GPU capacity, model files and network. FlashRouter connects that
endpoint through its existing upstream and model-edition workflow.

## 1. Serve a stable model ID with authentication

Choose a model supported by your installed engine version and hardware. Pin its
revision, configure its chat template and verify the capabilities you intend to
sell. The examples below set the public upstream model ID to `idc-model-v1`; GPU
count, context limits and engine tuning depend on your model and hardware.

For **vLLM**, provide `VLLM_API_KEY` locally through your existing secret
manager or protected service environment, then start the server without a key in
the command line:

```sh
vllm serve /srv/models/your-model \
  --host 127.0.0.1 --port 8000 \
  --served-model-name idc-model-v1
```

See the official [server arguments](https://docs.vllm.ai/en/latest/cli/serve/)
and
[API-key environment variable](https://docs.vllm.ai/en/latest/configuration/env_vars/).

For **SGLang**, use its existing YAML configuration support. On the IDC host,
create `/etc/sglang/serve.yaml` with access restricted to the service owner (for
example, mode `0600`), and fill its key locally:

```yaml
model-path: /srv/models/your-model
served-model-name: idc-model-v1
host: 127.0.0.1
port: 30000
api-key: <fill-in-locally>
```

```sh
python -m sglang.launch_server --config /etc/sglang/serve.yaml
```

The placeholder is not a usable credential. Keep the real file and key outside
chat, the repository and agent tools. See SGLang's official
[server arguments and YAML configuration](https://docs.sglang.io/docs/advanced_features/server_arguments).

Loopback binding assumes the HTTPS reverse proxy runs on the same host. If your
proxy runs elsewhere, bind a restricted interface reachable by that proxy and
apply the corresponding firewall rules.

## 2. Make the endpoint reachable over HTTPS

Use a stable public DNS name and valid TLS certificate, for example
`https://inference.example.com/v1`. Allow authenticated `/v1/models` and the
inference routes you actually need, such as `/v1/chat/completions`; keep engine
administration, debug and cluster ports private. vLLM documents that its API-key
check does not cover every endpoint, so do not forward all engine paths to the
Internet. See
[vLLM security guidance](https://docs.vllm.ai/en/latest/usage/security/).

Both FlashRouter Jobs (discovery) and its external LiteLLM service (inference)
need to reach the endpoint. Restrict ingress to those callers where your network
setup permits, while preserving bearer authentication. Validate model listing
and the intended inference/streaming behavior from those networks. A successful
model listing alone does not verify inference capabilities.

Current FlashRouter production discovery requires HTTPS and a public DNS
hostname resolving only to public addresses. It rejects IP-literal URLs,
private/loopback addresses, and URLs containing credentials, queries or
fragments. An endpoint reachable only on an intranet or VPN cannot use this
discovery path. Provide an authenticated public HTTPS edge to the IDC service,
or separately design and approve private-network support; do not disable the
existing checks.

## 3. Use the native Admin form

Ask the Admin plugin for its native **Upstreams** link, then fill in the
existing form yourself:

| Field            | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| Name             | A recognizable upstream name, such as `IDC inference`           |
| Protocol         | `openai_compatible`                                             |
| LiteLLM provider | `openai`                                                        |
| API base         | `https://inference.example.com/v1`                              |
| API key          | The real inference key, entered only in the native secret field |

Save and discover models through native Admin. Return only the selected upstream
ID to the chat; the agent can select/import `idc-model-v1` from the discovered
list, matching the server's model-list ID.

## 4. Onboard and continue with the plugin

With the required explicit platform grants, the plugin imports the selected
models, configures draft edition specifications, prepares edition certification
and deployment routing approval, and reads back the results. The owner confirms
import, certification and deployment approval in the existing native review UI.
Certification requires an Admin-role grant; the other onboarding writes require
Operator or higher. Missing authority stays a native permission decision.

Supply verified capabilities, context/output limits, RPM/TPM limits and customer
selling prices. The agent does not invent specifications for a private IDC
model. Jobs must establish fresh active/healthy deployment evidence before
certification/approval can pass. Import success alone is not readiness.

After prerequisites pass, continue with a disabled **Direct** draft for one
selected edition or a **Policy** draft with approved candidates and weights.
Publication and customer access remain separate decisions. Approval may affect
existing live routing, so review the exact deployment and edition before
confirming.

The plugin cannot create/rotate a credential, host an inference engine, bypass
network restrictions or publish an API model merely because the key was saved.
