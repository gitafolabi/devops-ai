"""
=============================================================================
AIOps Assistant — Azure Edition
Azure Functions + Azure OpenAI Function Calling
=============================================================================
This file contains all 3 Azure Function codes, their OpenAI function
definitions, and the orchestrator agent code.

Architecture:
  Streamlit UI → Azure OpenAI (gpt-4o) with function calling
                → Azure Functions (HTTP trigger) as tools
                → Azure Monitor Logs / Metrics / AKS / PostgreSQL

Authentication: DefaultAzureCredential (Managed Identity in production,
                az login locally)

Required pip packages:
  azure-identity azure-monitor-query azure-mgmt-containerservice
  azure-mgmt-postgresql azure-mgmt-network openai streamlit python-dotenv
=============================================================================
"""


# =============================================================================
# AZURE FUNCTION 1: aiops-fetch-logs
# =============================================================================
# Purpose: Queries Azure Monitor Log Analytics workspace using KQL
# Trigger: HTTP POST from the AI agent
# Equivalent to: CloudWatch Logs filter_log_events
# =============================================================================

FETCH_LOGS_CODE = """
import azure.functions as func
import json
import os
import re
from datetime import timedelta
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient, LogsQueryStatus

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

WORKSPACE_ID = os.environ["LOG_ANALYTICS_WORKSPACE_ID"]

@app.route(route="fetch_logs", methods=["POST"])
def fetch_logs(req: func.HttpRequest) -> func.HttpResponse:
    try:
        params = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"status": "error", "message": "Invalid JSON body"}),
            mimetype="application/json", status_code=400
        )

    search_term  = params.get("search_term", "error")
    table        = params.get("table", "ContainerLog")
    hours_back   = int(params.get("hours_back", 1))
    namespace    = params.get("namespace", "")
    limit        = int(params.get("limit", 50))

    ALLOWED_TABLES = {"ContainerLog", "AzureDiagnostics", "AppServiceConsoleLogs", "KubeEvents", "SecurityEvent"}
    if table not in ALLOWED_TABLES:
        return func.HttpResponse(
            json.dumps({"status": "error", "message": f"Invalid table. Allowed: {sorted(ALLOWED_TABLES)}"}),
            mimetype="application/json", status_code=400
        )
    search_term = re.sub(r'[\"\'\\|;]', '', search_term)[:200]
    if namespace and not re.match(r'^[a-zA-Z0-9-]+$', namespace):
        return func.HttpResponse(
            json.dumps({"status": "error", "message": "namespace must contain only alphanumeric characters and hyphens"}),
            mimetype="application/json", status_code=400
        )
    limit = min(max(1, limit), 500)
    hours_back = min(max(1, hours_back), 168)

    # Build KQL query — ContainerLog covers AKS pod stdout/stderr
    # CommonSecurityLog, AppServiceConsoleLogs, etc. for other sources
    namespace_filter = f'| where PodNamespace == "{namespace}"' if namespace else ""

    kql = f\"\"\"
{table}
{namespace_filter}
| where TimeGenerated > ago({hours_back}h)
| where LogEntry has "{search_term}" or LogEntrySource has "{search_term}"
| project TimeGenerated, PodName, ContainerName, LogEntry, LogEntrySource
| order by TimeGenerated desc
| limit {limit}
\"\"\"

    try:
        credential = DefaultAzureCredential()
        client = LogsQueryClient(credential)

        response = client.query_workspace(
            workspace_id=WORKSPACE_ID,
            query=kql,
            timespan=timedelta(hours=hours_back)
        )

        if response.status == LogsQueryStatus.PARTIAL:
            # Partial success — return what we have
            table_data = response.partial_data[0] if response.partial_data else None
        elif response.status == LogsQueryStatus.SUCCESS:
            table_data = response.tables[0] if response.tables else None
        else:
            return func.HttpResponse(
                json.dumps({"status": "error", "message": str(response.partial_error)}),
                mimetype="application/json"
            )

        if not table_data or not table_data.rows:
            result = {
                "status": "no_logs_found",
                "message": f"No logs matching '{search_term}' in {table} for the last {hours_back} hour(s).",
                "search_term": search_term,
                "table": table,
                "hours_back": hours_back,
            }
        else:
            columns = [col.name for col in table_data.columns]
            logs = []
            for row in table_data.rows:
                entry = dict(zip(columns, row))
                # Normalise timestamp to string
                if "TimeGenerated" in entry and hasattr(entry["TimeGenerated"], "strftime"):
                    entry["TimeGenerated"] = entry["TimeGenerated"].strftime("%Y-%m-%d %H:%M:%S")
                logs.append(entry)

            result = {
                "status": "logs_found",
                "table": table,
                "search_term": search_term,
                "hours_back": hours_back,
                "total_events": len(logs),
                "logs": logs,
            }

    except Exception as e:
        result = {"status": "error", "message": str(e)}

    return func.HttpResponse(json.dumps(result, indent=2), mimetype="application/json")
"""


# =============================================================================
# AZURE FUNCTION 2: aiops-fetch-metrics
# =============================================================================
# Purpose: Pulls Azure Monitor metrics for any resource
# Trigger: HTTP POST from the AI agent
# Equivalent to: CloudWatch get_metric_statistics
# =============================================================================

FETCH_METRICS_CODE = """
import azure.functions as func
import json
import os
from datetime import datetime, timedelta, timezone
from azure.identity import DefaultAzureCredential
from azure.monitor.query import MetricsQueryClient, MetricAggregationType

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

SUBSCRIPTION_ID = os.environ["AZURE_SUBSCRIPTION_ID"]

@app.route(route="fetch_metrics", methods=["POST"])
def fetch_metrics(req: func.HttpRequest) -> func.HttpResponse:
    try:
        params = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"status": "error", "message": "Invalid JSON body"}),
            mimetype="application/json", status_code=400
        )

    resource_id    = params.get("resource_id")       # Full ARM resource ID
    metric_names   = params.get("metric_names", ["CpuUsagePercentage"])
    hours_back     = int(params.get("hours_back", 1))
    granularity_min = int(params.get("granularity_minutes", 5))
    aggregation    = params.get("aggregation", "Average")  # Average|Maximum|Minimum|Total|Count

    if not resource_id:
        return func.HttpResponse(
            json.dumps({"status": "error", "message": "resource_id is required"}),
            mimetype="application/json", status_code=400
        )

    agg_map = {
        "Average": MetricAggregationType.AVERAGE,
        "Maximum": MetricAggregationType.MAXIMUM,
        "Minimum": MetricAggregationType.MINIMUM,
        "Total":   MetricAggregationType.TOTAL,
        "Count":   MetricAggregationType.COUNT,
    }
    agg_type = agg_map.get(aggregation, MetricAggregationType.AVERAGE)

    end_time   = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=hours_back)

    try:
        credential = DefaultAzureCredential()
        client = MetricsQueryClient(credential)

        response = client.query_resource(
            resource_uri=resource_id,
            metric_names=metric_names if isinstance(metric_names, list) else [metric_names],
            timespan=(start_time, end_time),
            granularity=timedelta(minutes=granularity_min),
            aggregations=[agg_type],
        )

        metrics_result = {}
        for metric in response.metrics:
            datapoints = []
            for ts in metric.timeseries:
                for dp in ts.data:
                    value = getattr(dp, aggregation.lower(), None)
                    if value is not None:
                        datapoints.append({
                            "timestamp": dp.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                            "value": round(value, 4),
                            "unit": metric.unit,
                        })

            if datapoints:
                values = [d["value"] for d in datapoints]
                metrics_result[metric.name] = {
                    "unit": metric.unit,
                    "aggregation": aggregation,
                    "summary": {
                        "current": round(values[-1], 4),
                        "average": round(sum(values) / len(values), 4),
                        "maximum": round(max(values), 4),
                        "minimum": round(min(values), 4),
                    },
                    "total_datapoints": len(datapoints),
                    "datapoints": datapoints,
                }
            else:
                metrics_result[metric.name] = {"status": "no_data"}

        result = {
            "status": "data_found" if any(
                "summary" in v for v in metrics_result.values()
            ) else "no_data",
            "resource_id": resource_id,
            "time_range_hours": hours_back,
            "metrics": metrics_result,
        }

    except Exception as e:
        result = {"status": "error", "message": str(e)}

    return func.HttpResponse(json.dumps(result, indent=2), mimetype="application/json")
"""


# =============================================================================
# AZURE FUNCTION 3: aiops-fetch-service-health
# =============================================================================
# Purpose: Checks live health of AKS deployments, PostgreSQL, App Gateway
# Trigger: HTTP POST from the AI agent
# Equivalent to: ECS/RDS/ALB health checks
# =============================================================================

FETCH_HEALTH_CODE = """
import azure.functions as func
import json
import os
from azure.identity import DefaultAzureCredential
from azure.mgmt.containerservice import ContainerServiceClient
from azure.mgmt.postgresql.flexibleservers import PostgreSQLManagementClient
from azure.mgmt.network import NetworkManagementClient
from kubernetes import client as k8s_client, config as k8s_config
from kubernetes.client.rest import ApiException

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

SUBSCRIPTION_ID = os.environ["AZURE_SUBSCRIPTION_ID"]
RESOURCE_GROUP  = os.environ.get("RESOURCE_GROUP", "")

@app.route(route="fetch_service_health", methods=["POST"])
def fetch_service_health(req: func.HttpRequest) -> func.HttpResponse:
    try:
        params = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"status": "error", "message": "Invalid JSON body"}),
            mimetype="application/json", status_code=400
        )

    service_type    = params.get("service_type", "all")   # aks|postgres|appgw|all
    resource_group  = params.get("resource_group", RESOURCE_GROUP)
    aks_cluster     = params.get("aks_cluster_name", "")
    namespace       = params.get("namespace", "")          # K8s namespace to inspect
    pg_server       = params.get("postgres_server_name", "")
    appgw_name      = params.get("appgw_name", "")

    credential = DefaultAzureCredential()
    results = {}

    # ── AKS ──────────────────────────────────────────────────────────────────
    if service_type in ("aks", "all") and aks_cluster and resource_group:
        try:
            aks_client = ContainerServiceClient(credential, SUBSCRIPTION_ID)
            cluster = aks_client.managed_clusters.get(resource_group, aks_cluster)

            agent_pools = []
            for pool in cluster.agent_pool_profiles or []:
                agent_pools.append({
                    "name": pool.name,
                    "count": pool.count,
                    "vm_size": pool.vm_size,
                    "provisioning_state": pool.provisioning_state,
                    "power_state": pool.power_state.code if pool.power_state else "Unknown",
                })

            # Get kubeconfig and check deployments / pods via K8s API
            deployments_health = []
            try:
                kubeconfig = aks_client.managed_clusters.list_cluster_admin_credentials(
                    resource_group, aks_cluster
                )
                # In production with Managed Identity, use in-cluster config instead:
                # k8s_config.load_incluster_config()
                k8s_config.load_kube_config_from_dict(
                    kubeconfig.kubeconfigs[0].value.decode()
                    if hasattr(kubeconfig.kubeconfigs[0].value, "decode")
                    else kubeconfig.kubeconfigs[0].value
                )
                apps_v1 = k8s_client.AppsV1Api()

                kwargs = {"namespace": namespace} if namespace else {}
                deploys = apps_v1.list_namespaced_deployment(**kwargs) if namespace \
                          else apps_v1.list_deployment_for_all_namespaces()

                for d in deploys.items:
                    desired  = d.spec.replicas or 0
                    ready    = d.status.ready_replicas or 0
                    deployments_health.append({
                        "name":       d.metadata.name,
                        "namespace":  d.metadata.namespace,
                        "desired":    desired,
                        "ready":      ready,
                        "available":  d.status.available_replicas or 0,
                        "healthy":    ready == desired and desired > 0,
                    })
            except Exception as ke:
                deployments_health = [{"error": f"K8s API unavailable: {ke}"}]

            results["aks"] = {
                "cluster": aks_cluster,
                "provisioning_state": cluster.provisioning_state,
                "kubernetes_version": cluster.kubernetes_version,
                "fqdn": cluster.fqdn,
                "agent_pools": agent_pools,
                "deployments": deployments_health,
                "all_healthy": (
                    bool(deployments_health)
                    and not any("error" in d for d in deployments_health)
                    and all(d.get("healthy", False) for d in deployments_health)
                ),
            }

        except Exception as e:
            results["aks"] = {"status": "error", "message": str(e)}

    # ── PostgreSQL Flexible Server ────────────────────────────────────────────
    if service_type in ("postgres", "all") and resource_group:
        try:
            pg_client = PostgreSQLManagementClient(credential, SUBSCRIPTION_ID)

            servers = (
                [pg_client.servers.get(resource_group, pg_server)]
                if pg_server
                else list(pg_client.servers.list_by_resource_group(resource_group))
            )

            pg_results = []
            for srv in servers:
                pg_results.append({
                    "name":               srv.name,
                    "state":              srv.state,
                    "version":            srv.version,
                    "sku":                srv.sku.name if srv.sku else "Unknown",
                    "storage_gb":         srv.storage.storage_size_gb if srv.storage else None,
                    "high_availability":  srv.high_availability.mode if srv.high_availability else "Disabled",
                    "healthy":            srv.state == "Ready",
                })

            results["postgres"] = {
                "servers": pg_results,
                "all_healthy": all(s["healthy"] for s in pg_results),
            }

        except Exception as e:
            results["postgres"] = {"status": "error", "message": str(e)}

    # ── Application Gateway ───────────────────────────────────────────────────
    if service_type in ("appgw", "all") and resource_group:
        try:
            net_client = NetworkManagementClient(credential, SUBSCRIPTION_ID)

            gateways = (
                [net_client.application_gateways.get(resource_group, appgw_name)]
                if appgw_name
                else list(net_client.application_gateways.list(resource_group))
            )

            gw_results = []
            for gw in gateways:
                backend_health_summary = []
                try:
                    backend_health = net_client.application_gateways.begin_backend_health(
                        resource_group, gw.name
                    ).result()
                    for pool in backend_health.backend_address_pools or []:
                        for http_setting in pool.backend_http_settings_collection or []:
                            for server in http_setting.servers or []:
                                backend_health_summary.append({
                                    "address": server.address,
                                    "health":  server.health,
                                    "healthy": server.health == "Healthy",
                                })
                except Exception:
                    backend_health_summary = []

                gw_results.append({
                    "name":               gw.name,
                    "provisioning_state": gw.provisioning_state,
                    "operational_state":  gw.operational_state,
                    "sku":                gw.sku.name if gw.sku else "Unknown",
                    "backend_targets":    backend_health_summary,
                    "all_backends_healthy": all(
                        b["healthy"] for b in backend_health_summary
                    ) if backend_health_summary else True,
                })

            results["appgw"] = {
                "gateways": gw_results,
                "all_healthy": all(g["all_backends_healthy"] for g in gw_results),
            }

        except Exception as e:
            results["appgw"] = {"status": "error", "message": str(e)}

    overall_healthy = all(
        results.get(svc, {}).get("all_healthy", True)
        for svc in ["aks", "postgres", "appgw"]
        if svc in results
    )

    result = {
        "status": "success",
        "overall_healthy": overall_healthy,
        "services_checked": list(results.keys()),
        "details": results,
    }

    return func.HttpResponse(json.dumps(result, indent=2, default=str), mimetype="application/json")
"""


# =============================================================================
# OPENAI FUNCTION DEFINITIONS
# =============================================================================
# Paste these into your Azure OpenAI / AI Foundry agent tools config.
# These replace the Bedrock OpenAPI schemas.
# =============================================================================

FUNCTION_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "fetch_logs",
            "description": (
                "Search Azure Monitor Log Analytics for log entries matching a keyword or phrase. "
                "Use when the user asks about errors, exceptions, warnings, crashes, slow queries, "
                "or any application-level issue visible in logs. "
                "Available tables: ContainerLog (AKS pod logs), AzureDiagnostics (PaaS services), "
                "AppServiceConsoleLogs, KubeEvents (K8s events), SecurityEvent."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "search_term": {
                        "type": "string",
                        "description": "Keyword or phrase to search for. Examples: error, timeout, OOMKilled, 503, connection refused, failed"
                    },
                    "table": {
                        "type": "string",
                        "description": "Log Analytics table to query.",
                        "enum": ["ContainerLog", "KubeEvents", "AzureDiagnostics", "AppServiceConsoleLogs", "SecurityEvent"],
                        "default": "ContainerLog"
                    },
                    "hours_back": {
                        "type": "integer",
                        "description": "How many hours back to search. Use 1 for recent issues, 6 for trends, 24 for daily patterns.",
                        "default": 1
                    },
                    "namespace": {
                        "type": "string",
                        "description": "Kubernetes namespace to filter logs. Leave empty for all namespaces. Example: boutique, kube-system"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of log entries to return.",
                        "default": 50
                    }
                },
                "required": ["search_term"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_metrics",
            "description": (
                "Retrieve Azure Monitor metrics for any Azure resource. "
                "Use when the user asks about CPU, memory, storage, latency, connections, "
                "requests, error rates, or any numerical performance data. "
                "Common resource types: AKS (Microsoft.ContainerService/managedClusters), "
                "PostgreSQL (Microsoft.DBforPostgreSQL/flexibleServers), "
                "App Gateway (Microsoft.Network/applicationGateways)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_id": {
                        "type": "string",
                        "description": "Full Azure Resource ID. Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/{type}/{name}"
                    },
                    "metric_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "List of metric names to retrieve. "
                            "AKS metrics: cpu_usage_percentage, memory_working_set_percentage, node_cpu_usage_percentage. "
                            "PostgreSQL metrics: cpu_percent, memory_percent, storage_percent, active_connections, read_iops, write_iops. "
                            "App Gateway metrics: CpuUtilization, FailedRequests, HealthyHostCount, UnhealthyHostCount, TotalRequests, ResponseStatus."
                        )
                    },
                    "hours_back": {
                        "type": "integer",
                        "description": "Number of hours of data to retrieve.",
                        "default": 1
                    },
                    "granularity_minutes": {
                        "type": "integer",
                        "description": "Data point granularity in minutes. Use 1 for high resolution, 5 for standard, 60 for hourly trends.",
                        "default": 5
                    },
                    "aggregation": {
                        "type": "string",
                        "description": "Aggregation type.",
                        "enum": ["Average", "Maximum", "Minimum", "Total", "Count"],
                        "default": "Average"
                    }
                },
                "required": ["resource_id", "metric_names"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_service_health",
            "description": (
                "Check the live health status of Azure services: AKS cluster and pod deployments, "
                "PostgreSQL Flexible Server instances, and Application Gateway backend health. "
                "Use when the user asks if services are running, if the database is up, "
                "whether all pods are ready, or for a general infrastructure health check."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "service_type": {
                        "type": "string",
                        "description": "Which service to check.",
                        "enum": ["aks", "postgres", "appgw", "all"],
                        "default": "all"
                    },
                    "resource_group": {
                        "type": "string",
                        "description": "Azure resource group name containing the services."
                    },
                    "aks_cluster_name": {
                        "type": "string",
                        "description": "AKS cluster name. Required when service_type is aks or all."
                    },
                    "namespace": {
                        "type": "string",
                        "description": "Kubernetes namespace to inspect deployments in. Leave empty for all namespaces."
                    },
                    "postgres_server_name": {
                        "type": "string",
                        "description": "PostgreSQL Flexible Server name. If omitted, checks all servers in the resource group."
                    },
                    "appgw_name": {
                        "type": "string",
                        "description": "Application Gateway name. If omitted, checks all gateways in the resource group."
                    }
                },
                "required": ["service_type", "resource_group"]
            }
        }
    }
]


# =============================================================================
# ORCHESTRATOR — Azure OpenAI Agent
# =============================================================================
# This is the Streamlit app that ties everything together.
# Equivalent to a Bedrock Agent session — uses Azure OpenAI function calling.
# =============================================================================

ORCHESTRATOR_CODE = """
import os
import json
import requests
import streamlit as st
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

# Azure OpenAI client
aoai_client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version="2024-02-15-preview",
)
DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")

# Azure Function base URL + key
FUNCTION_BASE_URL = os.environ["AZURE_FUNCTION_BASE_URL"]  # e.g. https://aiops-fn.azurewebsites.net/api
FUNCTION_KEY      = os.environ["AZURE_FUNCTION_KEY"]

# Your infra identifiers — agent uses these when calling health/metrics tools
INFRA = {
    "subscription_id": os.environ.get("AZURE_SUBSCRIPTION_ID", ""),
    "resource_group":  os.environ.get("RESOURCE_GROUP", ""),
    "aks_cluster":     os.environ.get("AKS_CLUSTER_NAME", ""),
    "namespace":       os.environ.get("K8S_NAMESPACE", "boutique"),
}

SYSTEM_PROMPT = f\"\"\"You are an AIOps assistant for an Azure Kubernetes Service environment.
You help engineers investigate incidents, understand system health, and diagnose issues.

Infrastructure context:
- AKS cluster: {INFRA['aks_cluster']} in resource group {INFRA['resource_group']}
- Primary namespace: {INFRA['namespace']}
- Log Analytics workspace contains ContainerLog, KubeEvents, AzureDiagnostics tables

When answering questions:
1. Always check logs AND metrics together for a full picture
2. For health checks, check AKS deployments first, then database, then gateway
3. Summarise findings in plain English — highlight unhealthy services clearly
4. Suggest a remediation step if you identify a known issue pattern
\"\"\"

def call_azure_function(name: str, args: dict) -> str:
    url = f"{FUNCTION_BASE_URL}/{name}?code={FUNCTION_KEY}"
    try:
        resp = requests.post(url, json=args, timeout=30)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def run_agent(user_message: str, history: list) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    while True:
        response = aoai_client.chat.completions.create(
            model=DEPLOYMENT,
            messages=messages,
            tools=FUNCTION_DEFINITIONS,
            tool_choice="auto",
        )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls":
            # Execute all requested tool calls
            messages.append(choice.message.model_dump(exclude_unset=True))

            for tool_call in choice.message.tool_calls:
                fn_name = tool_call.function.name
                fn_args = json.loads(tool_call.function.arguments)

                # Inject known infra values if not supplied by the agent
                if fn_name == "fetch_service_health":
                    fn_args.setdefault("resource_group", INFRA["resource_group"])
                    fn_args.setdefault("aks_cluster_name", INFRA["aks_cluster"])
                    fn_args.setdefault("namespace", INFRA["namespace"])

                result = call_azure_function(fn_name, fn_args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })
        else:
            return choice.message.content


# ── Streamlit UI ──────────────────────────────────────────────────────────────

st.set_page_config(page_title="AIOps Assistant — Azure", page_icon="🔵", layout="wide")
st.title("🔵 AIOps Assistant — Azure")
st.caption("Ask about your AKS cluster, database, logs, and metrics in plain English.")

if "history" not in st.session_state:
    st.session_state.history = []
if "messages" not in st.session_state:
    st.session_state.messages = []

# Sidebar quick actions
with st.sidebar:
    st.header("Quick checks")
    if st.button("🏥 Full health check"):
        st.session_state.pending = "Run a full health check across AKS, PostgreSQL, and Application Gateway."
    if st.button("🚨 Recent errors"):
        st.session_state.pending = "Show me errors and warnings from the last hour in the boutique namespace."
    if st.button("📊 CPU & memory"):
        st.session_state.pending = "What is the current CPU and memory usage of the AKS cluster?"
    if st.button("🐘 Database health"):
        st.session_state.pending = "Is the PostgreSQL database healthy? Check connections and CPU."
    if st.button("📦 Pod status"):
        st.session_state.pending = "Are all pods in the boutique namespace running and ready?"
    if st.button("🔄 Clear chat"):
        st.session_state.history = []
        st.session_state.messages = []
        st.rerun()

# Render chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Handle quick action buttons
prompt = getattr(st.session_state, "pending", None)
if prompt:
    del st.session_state.pending

prompt = prompt or st.chat_input("Ask about your Azure infrastructure...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Checking your infrastructure..."):
            answer = run_agent(prompt, st.session_state.history)
        st.markdown(answer)

    st.session_state.messages.append({"role": "assistant", "content": answer})
    st.session_state.history.append({"role": "user",      "content": prompt})
    st.session_state.history.append({"role": "assistant", "content": answer})
"""


# =============================================================================
# .env TEMPLATE
# =============================================================================

ENV_TEMPLATE = """
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Azure Function App
AZURE_FUNCTION_BASE_URL=https://<your-fn-app>.azurewebsites.net/api
AZURE_FUNCTION_KEY=

# Infrastructure identifiers (injected into agent context)
AZURE_SUBSCRIPTION_ID=
RESOURCE_GROUP=
AKS_CLUSTER_NAME=
K8S_NAMESPACE=boutique

# Log Analytics Workspace (set as App Setting on the Function App too)
LOG_ANALYTICS_WORKSPACE_ID=
"""


# =============================================================================
# SAMPLE KQL QUERIES — equivalent to the AWS test log data
# Run these in Log Analytics > Logs to verify data exists
# =============================================================================

SAMPLE_KQL_QUERIES = """
-- All errors in boutique namespace last hour
ContainerLog
| where TimeGenerated > ago(1h)
| where PodNamespace == "boutique"
| where LogEntry has "error" or LogEntry has "Error"
| project TimeGenerated, PodName, ContainerName, LogEntry
| order by TimeGenerated desc
| limit 50

-- K8s events (OOMKilled, CrashLoopBackOff, Failed)
KubeEvents
| where TimeGenerated > ago(1h)
| where Namespace == "boutique"
| where Reason in ("OOMKilling", "BackOff", "Failed", "Unhealthy")
| project TimeGenerated, Namespace, Name, Reason, Message
| order by TimeGenerated desc

-- Pod restarts over time
KubePodInventory
| where TimeGenerated > ago(6h)
| where Namespace == "boutique"
| summarize restarts=max(PodRestartCount) by PodName, bin(TimeGenerated, 10m)
| where restarts > 0
| order by TimeGenerated desc
"""
