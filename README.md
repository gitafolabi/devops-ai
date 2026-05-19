# DevOps AI — Boutique Microservices Platform

A production-grade microservices platform deployable on Azure Kubernetes Service (AKS) and AWS EKS, built to demonstrate real-world DevOps, SRE, and AI-assisted engineering practices. Everything here was built iteratively — from local Docker Compose, through cloud Kubernetes deployment, GitOps automation, security hardening, full-stack observability, and AI-powered incident response.

---

## What This Project Is

An e-commerce boutique application decomposed into seven backend microservices and a React frontend. The application layer is intentionally straightforward — the engineering focus is on the platform around it: how services are built, deployed, secured, observed, and operated.

---

## Architecture

```
                          ┌─────────────────────────────────────┐
                          │      Kubernetes Cluster (AKS / EKS)  │
                          │  Namespace: boutique                 │
                          │                                      │
  Browser ──► Ingress ──► │  Gateway ──► Auth                   │
  (HTTPS/TLS)  Nginx      │     │                               │
                          │     ├──► Product Service             │
                          │     ├──► Orders ──► Order Service    │
                          │     ├──► User Service                │
                          │     └──► Notification Service        │
                          │                                      │
                          │  PostgreSQL (StatefulSet, 4 DBs)     │
                          │  RabbitMQ (AMQP messaging)           │
                          │  Jaeger (distributed tracing)        │
                          │  Prometheus + Grafana (metrics)      │
                          └─────────────────────────────────────┘
                                        ▲
                              ArgoCD (GitOps sync)
                                        ▲
                              GitHub (this repository)
                                        ▲
                              GitHub Actions CI/CD
```

---

## Services

| Service | Language | Responsibility |
|---------|----------|----------------|
| `gateway` | Node.js / TypeScript | API gateway, JWT auth middleware, request routing |
| `auth` | Node.js / TypeScript | User registration, login, JWT issuance |
| `product-service` | Node.js / TypeScript | Product catalog, image uploads (multer/sharp) |
| `orders` | Node.js / TypeScript | Order placement, RabbitMQ publisher |
| `order-service` | Node.js / TypeScript | Order processing, RabbitMQ consumer |
| `user-service` | Node.js / TypeScript | User profile management |
| `notification-service` | Node.js / TypeScript | Email dispatch via Nodemailer/Resend, RabbitMQ consumer |
| `frontend` | React 19 + Material UI v7 | Single-page application |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Application | Node.js / TypeScript, React 19, Material UI v7 |
| Database | PostgreSQL (StatefulSet — 4 databases: auth, products, orders, users) ¹ |
| Messaging | RabbitMQ (AMQP) |
| Containers | Docker, Docker Compose (local dev) |
| Orchestration | Kubernetes on AKS (Azure) or EKS (AWS) |
| Infrastructure | Terraform — AWS: VPC, EKS, ECR, Secrets Manager / Azure: VNet, AKS, ACR, Key Vault |
| CI/CD | GitHub Actions |
| GitOps | ArgoCD + Kustomize |
| Metrics | Prometheus + Grafana (RED method dashboards) |
| Logging | Loki + Promtail (Grafana-native, label-based, lightweight) + ELK Stack (Elasticsearch 8.5, Kibana, Fluent Bit, Logstash — full-text search, parsed fields, ILM, kube-events) |
| Tracing | Jaeger + OpenTelemetry SDK (OTLP HTTP) |
| Security scanning | Trivy (image CVE scan + K8s misconfiguration scan) |
| Secrets management | External Secrets Operator (ESO) — Azure Key Vault (`crud-kv`) for AKS / AWS Secrets Manager (`boutique/*`) for EKS |
| TLS | cert-manager + Let's Encrypt (HTTP-01 challenges) |
| AI / AIOps | AWS Bedrock Agent (Kira), Azure Functions + OpenAI GPT-4o |
| Automated review | DryRun Security, ChatGPT Codex connector |

> **¹ Production note:** PostgreSQL runs as a StatefulSet inside the cluster for simplicity. In a real production environment, replace it with a managed database service — **AWS RDS / Aurora PostgreSQL** (for EKS) or **Azure Database for PostgreSQL – Flexible Server** (for AKS). Managed databases handle automated backups, point-in-time recovery, high availability failover, and patching — none of which the in-cluster StatefulSet provides. The connection strings (`AUTH_DB_URL`, `PRODUCTS_DB_URL`, etc.) are already externalised via ESO secrets, so the swap requires only updating the secret values to point at the managed endpoint — no application code changes needed.

---

## Repository Structure

```
devops-ai/
├── README.md                          # This file
├── docs/
│   ├── part1-system-design.md         # System design concepts (12 DevOps pillars)
│   └── part2-workflow.md              # End-to-end workflow overview
├── projects/
│   ├── boutique-microservices/
│   │   ├── backend/services/          # 7 Node.js/TypeScript services
│   │   └── frontend/                  # React 19 + Material UI v7
│   ├── aiops-assistant/               # AIOps assistant (AWS Bedrock + Azure Functions)
│   └── Infrastructure/                # Terraform — VPC, EKS, ECR, ArgoCD, Secrets Manager
│       └── modules/
│           ├── vpc/                   # VPC, subnets, route tables
│           ├── eks/                   # EKS cluster + node group + OIDC provider
│           ├── ecr/                   # ECR repositories for all services
│           ├── argocd/                # ArgoCD via Helm
│           └── secrets-manager/       # AWS Secrets Manager secrets + IRSA role
├── gitops/
│   ├── k8s/
│   │   ├── backend/                   # Deployment + Service manifests for all services
│   │   ├── database/                  # PostgreSQL StatefulSet + restore Job
│   │   ├── frontend/                  # Frontend Deployment + Service
│   │   ├── hpa.yml                    # HorizontalPodAutoscalers
│   │   ├── pdb.yml                    # PodDisruptionBudgets
│   │   └── loki-datasource.yml        # Grafana datasource for Loki (auto-imported)
│   ├── argo-cd.yml                    # ArgoCD Application manifest
│   ├── kustomization.yml              # Kustomize entry point
│   ├── cluster-secret-store.yml       # ESO ClusterSecretStore → Azure Key Vault
│   ├── external-secret.yml            # ExternalSecret for Azure deployments
│   ├── aws-cluster-secret-store.yml   # ESO ClusterSecretStore → AWS Secrets Manager
│   ├── aws-external-secret.yml        # ExternalSecret for AWS deployments
│   ├── ingress.yml                    # Ingress routes (boutique)
│   ├── cert-manager-argo.yml          # cert-manager Helm App via ArgoCD
│   ├── loki-argo.yml                  # Loki + Promtail Helm App via ArgoCD
│   └── cert-manager-clusterissuer.yml # Let's Encrypt ClusterIssuer
└── .github/
    └── workflows/
        ├── azure-ci.yml               # Azure CI — DockerHub (ACR-ready), Trivy scan, manifest update
        ├── aws-ci.yml                 # AWS CI — ECR, Trivy scan, manifest update
        └── trivy-pr-scan.yml          # PR gate — Trivy config scan on gitops/
```

---

## CI/CD Pipelines

### Azure Pipeline (`azure-ci.yml`)
Triggers on `workflow_dispatch`. Builds all 8 services in parallel via matrix:

```
Matrix build (8 services in parallel, fail-fast: false)
  └── Build Docker image
  └── Trivy image scan (CRITICAL CVEs → fail, block push)
  └── Push to DockerHub

Update manifests job (after all matrix jobs pass)
  └── sed-update image tags in gitops/k8s/ manifests
  └── Commit + push → ArgoCD auto-syncs to AKS
```

### AWS Pipeline (`aws-ci.yml`)
Same structure, pushes to Amazon ECR. Builds all 8 services including `notification-service`:

```
Matrix build (8 services in parallel, fail-fast: false)
  └── Configure AWS credentials + ECR login
  └── Build Docker image
  └── Trivy image scan — pinned @0.28.0 (CRITICAL CVEs → fail)
  └── Push to ECR

Update manifests job (after all matrix jobs pass)
  └── sed-update ECR image tags in gitops/k8s/ manifests
  └── Commit + push → ArgoCD auto-syncs to EKS
```

Concurrency group cancels any in-progress run on a new trigger — prevents stale image tags racing to update manifests.

### PR Security Gate (`trivy-pr-scan.yml`)
Runs on every pull request. Trivy misconfiguration scan against `gitops/`. Any CRITICAL Kubernetes misconfiguration blocks the merge.

---

## Security

### Pod Security Contexts
Every pod has explicit security contexts at both pod and container level:

- `runAsNonRoot: true`, `runAsUser: 1000` on all Node.js services
- `readOnlyRootFilesystem: true` on all Node.js services (false only where runtime writes are required)
- `allowPrivilegeEscalation: false` on all containers
- `capabilities.drop: [ALL]` on all containers

### Secrets Management
All credentials are synced into the cluster via External Secrets Operator (ESO). The `boutique-secrets` Kubernetes Secret is entirely managed by ESO — no credentials anywhere in this repository.

**Azure AKS deployment:**
```
Azure Key Vault (crud-kv)
        │  refreshInterval: 1h
        ▼
ClusterSecretStore (azure-kv, ServicePrincipal auth)
        ▼
ExternalSecret → boutique-secrets K8s Secret
        ▼
Pods consume via secretKeyRef
```

**AWS EKS deployment:**
```
AWS Secrets Manager (boutique/* paths)
        │  refreshInterval: 1h
        ▼
ClusterSecretStore (aws-sm, IRSA — no static keys)
        ▼
ExternalSecret → boutique-secrets K8s Secret
        ▼
Pods consume via secretKeyRef
```

The same 13 secrets are managed in both stores under identical key names:
`POSTGRES_PASSWORD`, `AUTH_DB_URL`, `PRODUCTS_DB_URL`, `ORDERS_DB_URL`, `USERS_DB_URL`, `RABBIT_URL`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

No credentials exist in this repository.

To switch between cloud providers, swap two lines in `gitops/kustomization.yml` — the file is commented to show exactly which lines to change.

### Trivy Security Gates
| Gate | Trigger | What it scans | On failure |
|------|---------|---------------|------------|
| Image scan | Every CI build | Docker image CVEs | Blocks image push |
| Config scan | Every PR | `gitops/` K8s manifests | Blocks PR merge |

### Automated PR Security Review
- **DryRun Security** — scans for KQL injection, IDOR, unvalidated LLM tool calls, hardcoded credentials
- **ChatGPT Codex connector** — automated code review on every PR

---

## Observability

### Metrics — Prometheus + Grafana
- ServiceMonitors auto-discover metrics from gateway and auth services
- Grafana dashboards provisioned as ConfigMaps (Dashboard-as-Code)
- RED method dashboards: Rate, Errors, Duration per service

### Logs — Loki + Promtail and ELK Stack

This project runs **both** logging stacks. They serve different purposes and are genuinely complementary rather than redundant.

#### Loki + Promtail (deployed)

- Promtail runs as a DaemonSet, tailing all pod logs from `/var/log/pods/`
- Loki stores logs as compressed chunks indexed **only by labels** (namespace, pod, container, app) — it does not full-text index log content
- Grafana datasource auto-provisioned via ConfigMap — logs appear in the same Grafana instance as Prometheus metrics and Jaeger traces
- LogQL lets you correlate a log spike directly with a Prometheus rate or a Jaeger trace in a single panel
- 7-day retention; persistence disabled for this environment (enable for production)

#### ELK Stack — Elasticsearch + Kibana + Fluent Bit + Logstash (manifests ready, not deployed)

- **Fluent Bit** runs as a DaemonSet collecting all pod logs and routing them by namespace into labelled datasets (`boutique.app`, `nginx.access`, `nginx.error`, `monitoring.infra`, `kube.general`)
- **Logstash** parses each dataset: full nginx ingress grok (upstream fields, status codes, latency), JSON extraction for structured Node.js logs, status band classification (`2xx`/`3xx`/`4xx`/`5xx`)
- **kubernetes-event-exporter** ships the Kubernetes Events API (Pod restarts, OOMKilled, BackOff, scheduling failures) directly to Elasticsearch as a separate `kubernetes.events` data stream
- **Elasticsearch** stores everything with full-text indexing and explicit field mappings — numeric fields queryable with range filters, keyword fields usable in terms aggregations and percentile buckets
- **Kibana** provides Lens dashboards (nginx traffic overview, app log volume/error rate, K8s events timeline) provisioned automatically via ArgoCD PostSync Job
- ILM policy: daily rollover at 5 GB, automatic delete after 14 days across all 6 data streams

---

#### Loki vs ELK — comparison

| | Loki + Promtail | ELK Stack |
|--|--|--|
| **Index model** | Label-only (no full-text index on log content) | Full-text index + explicit field mappings |
| **Storage cost** | Very low — compressed log chunks | High — inverted indices for every field |
| **Query language** | LogQL | KQL / Elasticsearch DSL |
| **Field extraction** | At query time via regex (logfmt/json pipeline) | At ingest via Logstash grok/json filters |
| **Dashboards** | Grafana panels alongside metrics and traces | Kibana Lens, Canvas, Maps |
| **Kubernetes events** | Not captured natively | kubernetes-event-exporter → dedicated data stream |
| **Retention management** | Manual TTL config | ILM — automatic rollover + delete policies |
| **Resource footprint** | ~200 MB RAM total | ~8–12 GB RAM for a minimal 3-node ES cluster |
| **Operational complexity** | Low — single binary, no parsing config | High — ES cluster tuning, Logstash pipelines, ILM policies |
| **Startup time** | Seconds | Minutes (ES JVM warm-up) |

---

#### When to use each

**Use Loki when:**
- You need logs in the same Grafana view as Prometheus metrics and Jaeger traces — correlating a latency spike with a specific log line or trace span
- Your primary log access pattern is "show me logs for this pod/namespace in the last 15 minutes"
- You are operating a small-to-medium cluster and want lightweight, low-cost log aggregation
- You filter by labels first, then grep the content — not the other way round

**Use ELK when:**
- You need to **search log content** across all pods without knowing which pod generated it (e.g. searching for a specific error string across all services)
- You need **structured analytics**: top N upstream services by latency, P95 response times from nginx, error rate trends broken out by status band
- You want to **capture and query Kubernetes Events** (OOMKilled, CrashLoopBackOff, scheduling failures) as searchable structured data alongside your application logs
- You need **compliance or audit logging** with defined retention windows, immutable writes, and index lifecycle management
- You have large log volumes where field-level aggregations need to be precomputed at ingest, not derived at query time

**In this project:** Loki handles day-to-day log tailing and Grafana-native correlation. ELK (when deployed) handles nginx traffic analytics, Kubernetes event monitoring, and any investigation that requires searching log content rather than filtering by labels. The two stacks share no infrastructure — either can be used independently, and both can run simultaneously if resources allow.


### Distributed Tracing — Jaeger + OpenTelemetry
Four services are instrumented with the OpenTelemetry Node.js SDK:

| Service | Instrumented spans |
|---------|-------------------|
| `gateway` | HTTP incoming/outgoing, Express routes (excludes `/metrics` scrape noise) |
| `auth` | HTTP, Express, PostgreSQL queries |
| `orders` | HTTP, Express, PostgreSQL queries |
| `product-service` | HTTP, Express, PostgreSQL queries |

Traces are exported via OTLP HTTP to `http://jaeger:4318/v1/traces`. Full cross-service request chains including SQL query spans are visible in the Jaeger UI.

---

## GitOps with ArgoCD

ArgoCD is exposed at **https://argocd.test.chellrach.com** via nginx ingress with TLS from cert-manager. It watches this repository and syncs cluster state to `gitops/` — the same GitOps flow works identically on both AKS and EKS. Sync waves ensure dependencies deploy in order:

1. CRDs (cert-manager, prometheus-operator)
2. Infrastructure components (ESO, Ingress Nginx)
3. Application layer (services, database, frontend)

The CI pipeline (Azure → DockerHub, AWS → ECR) commits updated image tags back to `gitops/k8s/` manifests after every successful build. ArgoCD detects the change and performs a rolling update automatically on whichever cluster it is installed on.

---

## Infrastructure (Terraform)

Both cloud targets are fully provisioned with Terraform.

### AWS EKS — `projects/Infrastructure/`

| Module | What it creates |
|--------|----------------|
| `vpc` | VPC, 3 public subnets across 3 AZs, internet gateway, route tables |
| `eks` | EKS cluster v1.34, managed node group, OIDC provider, EBS CSI driver |
| `ecr` | ECR repositories for all 8 services |
| `argocd` | ArgoCD via Helm into the EKS cluster |
| `secrets-manager` | AWS Secrets Manager secrets (`boutique/*`) + IRSA role for ESO |

After `terraform apply`, annotate the ESO ServiceAccount with the IRSA role ARN output:

```bash
kubectl annotate serviceaccount external-secrets-sa \
  -n external-secrets \
  eks.amazonaws.com/role-arn=$(terraform output -raw external_secrets_irsa_role_arn)
```

### Azure AKS — [aks-app/infrastructure](https://github.com/gitafolabi/aks-app/tree/main/infrastructure)

The AKS Terraform configuration lives in a separate repository and provisions the equivalent Azure stack:

| AWS resource | Azure equivalent | What it creates |
|---|---|---|
| VPC | Azure Virtual Network (VNet) | Network + subnets for AKS nodes |
| EKS | Azure Kubernetes Service (AKS) | Managed Kubernetes cluster |
| ECR | DockerHub / Azure Container Registry (ACR) | Container image registry |
| IAM OIDC + IRSA | Azure Managed Identity / Workload Identity | Pod-level cloud credentials |
| Secrets Manager | Azure Key Vault (`crud-kv`) | Secret store for ESO |

---

## AIOps Assistant

Two implementations of an AI-powered SRE assistant. Both diagnose production incidents by querying logs, metrics, and cluster health, then generate root cause analysis and fix recommendations.

| | AWS Version (Kira) | Azure Version |
|--|--|--|
| AI runtime | AWS Bedrock Agent | OpenAI GPT-4o via Azure Functions |
| Log source | CloudWatch Logs | Azure Monitor / Log Analytics |
| Metrics | Prometheus | Azure Monitor Metrics |
| Health check | EKS + Prometheus | AKS + Prometheus |
| UI | Streamlit | HTTP endpoints |

The Azure version includes hardened security: KQL injection prevention, allowlisted LLM tool calls, and IDOR protection on resource ID validation.

See [projects/aiops-assistant/README.md](projects/aiops-assistant/README.md) for full setup.

---

## Local Development

```bash
cd projects/boutique-microservices
docker compose up

# Services available at:
# http://localhost:3000  — frontend
# http://localhost:3001  — gateway
# http://localhost:3002  — auth
# http://localhost:3003  — product-service
# http://localhost:5432  — postgres
# http://localhost:5672  — rabbitmq AMQP
# http://localhost:15672 — rabbitmq management UI
```

---

## Platform Features

| Area | What Changed |
|------|-------------|
| **Secrets (Azure)** | Migrated hardcoded credentials to Azure Key Vault via ESO — zero credentials in the repo |
| **Secrets (AWS)** | Added AWS Secrets Manager support via ESO + Terraform `secrets-manager` module (15 secrets + IRSA role) |
| **AWS CI** | Added Trivy image scan (pinned @0.28.0), `notification-service` to build matrix, `fail-fast: false`, concurrency group |
| **Liveness probes** | Added `livenessProbe` + `readinessProbe` to all 6 backend services |
| **PodDisruptionBudgets** | Added `pdb.yml` for gateway, auth, frontend, product-service |
| **Pod security** | `runAsNonRoot`, `readOnlyRootFilesystem`, `capabilities.drop: ALL` on all Node.js containers |
| **NODE_ENV** | Fixed `development` → `production` on all service deployments |
| **Resources** | Added missing `resources` block to `order-service`; all services have requests + limits |
| **Logging (Loki)** | Added Loki + Promtail — lightweight label-based log aggregation with Grafana-native datasource auto-provisioned |
| **Logging (ELK)** | Added ELK stack (Elasticsearch 3-node, Kibana, Fluent Bit, Logstash, kubernetes-event-exporter) — full-text indexing, parsed nginx fields, kube-events data stream, 14-day ILM, Kibana dashboards auto-imported via ArgoCD PostSync Job |
| **Tracing** | Added OpenTelemetry distributed tracing across 4 services with Jaeger backend |
| **Security scanning** | Trivy image CVE gate in CI + Trivy config scan gate on every PR |
| **Frontend** | Revamped UI with React 19 + Material UI v7 |
| **AIOps security** | Fixed KQL injection, IDOR, and unvalidated LLM tool call vulnerabilities |
| **Node.js deprecations** | Migrated all GitHub Actions to Node.js 24 runtime |
