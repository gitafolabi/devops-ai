# AIOps Assistant

An AI-powered SRE assistant that diagnoses production incidents by querying logs, metrics, and cluster health — then generates root cause analysis and fix recommendations in plain language.

Two implementations are available: one built on AWS Bedrock Agents (Kira), and one built on Azure Functions with OpenAI. Both expose the same three capabilities but use different cloud-native tooling.

---

## Implementations

| | AWS Version (Kira) | Azure Version |
|--|--|--|
| **AI runtime** | AWS Bedrock Agent | OpenAI GPT-4o (Azure Functions) |
| **Log source** | CloudWatch Logs | Azure Monitor / Log Analytics |
| **Metrics source** | Prometheus (ELB) | Azure Monitor Metrics |
| **Cluster health** | EKS DescribeCluster + Prometheus | AKS + Prometheus |
| **UI** | Streamlit (`app.py`) | HTTP function endpoints |
| **Code** | `aiops_all_lambda_code.py` | `aiops_azure_functions.py` |

---

## Capabilities (both versions)

### `fetch_logs`
Queries the log store for a given service, namespace, time window, and optional search term. Returns matching log lines with timestamps and severity.

### `fetch_metrics`
Pulls CPU, memory, request rate, and error rate for a given resource. Returns current values and recent trends.

### `fetch_service_health`
Checks deployment status, pod readiness, restart counts, and node health across the cluster. Returns an overall health verdict with per-service details.

---

## Architecture

### AWS Version (Kira)

```
Streamlit UI (app.py)
      │
      ▼
Bedrock Agent (Kira)
      │
      ├── fetch_logs         → CloudWatch Logs
      ├── fetch_metrics      → Prometheus (ELB endpoint)
      └── fetch_service_health → EKS cluster + Prometheus
```

### Azure Version

```
HTTP Client / AI assistant
      │
      ▼
Azure Functions (aiops_azure_functions.py)
      │
      ├── fetch_logs         → Azure Log Analytics / ContainerLog
      ├── fetch_metrics      → Azure Monitor Metrics API
      └── fetch_service_health → AKS + Prometheus
            │
            └── OpenAI GPT-4o (function calling for tool orchestration)
```

---

## Security Hardening (Azure version)

The Azure version was hardened against several vulnerability classes:

**KQL Injection prevention**
- Table names validated against an allowlist (`ContainerLog`, `AzureDiagnostics`, etc.)
- Search terms sanitized with regex, stripped of `"`, `'`, `\`, `|`, `;`
- Namespace validated to alphanumeric + hyphens only
- `limit` clamped to `[1, 500]`, `hours_back` clamped to `[1, 168]`

**Unvalidated LLM tool calling**
- All function names the LLM can invoke are checked against `ALLOWED_FUNCTIONS`
- Unknown function names return an error response rather than being executed

**IDOR (Insecure Direct Object Reference)**
- `resource_id` in `fetch_metrics` validated to start with the configured subscription prefix
- Prevents the LLM from being tricked into querying resources in other subscriptions

---

## AWS Version Setup (Kira)

### Prerequisites
- AWS account with Bedrock model access enabled
- EKS cluster with Prometheus exposed via LoadBalancer
- AWS CLI configured (`aws configure`)
- Python 3.10+

### Step 1 — Create IAM Roles

```bash
cd projects/aiops-assistant
chmod +x setup-iam.sh
./setup-iam.sh
```

This creates:

| Role | Used By | Permissions |
|------|---------|-------------|
| `aiops-lambda-role` | All 3 Lambda functions | CloudWatch Logs read, EKS describe, Lambda basic execution |
| `aiops-bedrock-agent-role` | Bedrock Agent | Invoke Lambda functions, invoke Bedrock models |

### Step 2 — Deploy Lambda Functions

Create these 3 functions in the AWS Console or via CLI. Use code from `lambda/`:

| Function Name | Code File | Runtime |
|---------------|-----------|---------|
| `aiops-fetch-logs` | `lambda/fetch_logs/lambda_function.py` | Python 3.12 |
| `aiops-fetch-metrics` | `lambda/fetch_metrics/lambda_function.py` | Python 3.12 |
| `aiops-fetch-health` | `lambda/fetch_health/lambda_function.py` | Python 3.12 |

Set timeout to **30 seconds** on all three.

### Step 3 — Configure Prometheus URL

Update `PROMETHEUS_URL` in `fetch_metrics` and `fetch_health` before uploading:

```python
PROMETHEUS_URL = "http://<YOUR_PROMETHEUS_ELB_URL>:9090"
```

To expose Prometheus as a LoadBalancer:

```bash
kubectl patch svc kube-prometheus-stack-prometheus -n monitoring \
  -p '{"spec": {"type": "LoadBalancer"}}'

kubectl get svc kube-prometheus-stack-prometheus -n monitoring
# Copy the EXTERNAL-IP
```

### Step 4 — Deploy the Bedrock Agent

```bash
chmod +x deploy.sh
./deploy.sh
```

The script creates the Bedrock Agent with the Kira system prompt, attaches all three action groups with OpenAPI schemas, and prepares the agent. Note the **Agent ID** printed at the end.

### Step 5 — (Optional) Generate Sample Data

```bash
python3 scripts/generate_sample_data.py --region us-east-1
```

Writes 100 realistic log events (503 errors, OOM kills, connection pool exhaustion) to `/app/production` in CloudWatch.

### Step 6 — Run the Streamlit UI

```bash
cp .env.example .env
# Edit .env with your values
pip install -r requirements.txt
streamlit run app.py
```

Open `http://localhost:8501`.

`.env` values:

```env
AWS_REGION=us-east-1
BEDROCK_AGENT_ID=<YOUR_AGENT_ID>
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
```

---

## Azure Version Setup

### Prerequisites
- Azure subscription with a deployed AKS cluster
- Azure Functions runtime (Python 3.11)
- Log Analytics workspace connected to the cluster
- OpenAI API key (or Azure OpenAI deployment)
- Azure Key Vault with the following secrets configured

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI or Azure OpenAI key |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `LOG_ANALYTICS_WORKSPACE_ID` | Log Analytics workspace ID |
| `LOG_ANALYTICS_WORKSPACE_KEY` | Log Analytics query key |
| `AKS_CLUSTER_NAME` | AKS cluster name |
| `AKS_RESOURCE_GROUP` | Resource group containing the cluster |
| `PROMETHEUS_URL` | Prometheus endpoint (internal or LoadBalancer) |

### Deploy to Azure Functions

```bash
cd projects/aiops-assistant
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
```

### Sample Questions (both versions)

- "Why are we seeing 503 errors in the last hour?"
- "Is CPU usage high across the boutique services?"
- "Check database connections and latency"
- "Are all pods healthy? Any restarts?"
- "What are the most frequent errors in the last 2 hours?"

---

## File Structure

```
aiops-assistant/
├── app.py                       # Streamlit chat UI (AWS version)
├── deploy.sh                    # Bedrock Agent deploy script
├── setup-iam.sh                 # IAM roles and policies
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variable template
├── aiops_all_lambda_code.py     # All 3 Lambda functions (consolidated)
├── aiops_azure_functions.py     # Azure Functions version
├── lambda/
│   ├── fetch_logs/              # CloudWatch Logs query
│   ├── fetch_metrics/           # Prometheus metrics query
│   └── fetch_health/            # EKS cluster health check
├── schemas/
│   ├── fetch_logs.json          # OpenAPI schema
│   ├── fetch_metrics.json       # OpenAPI schema
│   └── fetch_health.json        # OpenAPI schema
└── scripts/
    └── generate_sample_data.py  # Seed CloudWatch with test errors
```

---

## Troubleshooting

**Bedrock model access not enabled**
Go to AWS Console → Bedrock → Model access and enable the model used in `deploy.sh` before running it.

**Prometheus unreachable from Lambda**
Lambda by default runs outside a VPC — if you've placed it inside a VPC, ensure there's a NAT gateway or internet gateway route, and that the Prometheus security group allows inbound on port 9090.

**Agent stuck in PREPARING state**
Wait 30–60 seconds after `deploy.sh`. If it persists, check the Bedrock console for schema validation errors.

**`fetch_logs` returns no results**
The default log group `/eks/boutique/pods` is only created after Fluent Bit ships the first logs. Run the sample data generator (Step 5) to create `/app/production` immediately.

**`all_healthy` returns true despite errors**
This was a known bug — fixed by explicitly checking for error entries in the deployments list before evaluating the boolean. If you see unexpected `all_healthy: true` results, ensure you're on the patched version of `aiops_azure_functions.py`.

**KQL injection rejected**
The Azure version validates table names against an allowlist. If you get a 400 error with "Invalid table", use one of: `ContainerLog`, `AzureDiagnostics`, `AppServiceConsoleLogs`, `KubeEvents`, `SecurityEvent`.
