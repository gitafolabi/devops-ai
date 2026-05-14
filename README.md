# DevOps AI — Boutique Microservices Platform

A production-grade microservices platform deployed on Azure Kubernetes Service (AKS), built to demonstrate real-world DevOps, SRE, and AI-assisted engineering practices. Everything here was built iteratively — from local Docker Compose, through EKS, and ultimately migrated and hardened on AKS with GitOps, observability, security scanning, and AI operations.

---

## What This Project Is

An e-commerce boutique application decomposed into seven backend microservices and a React frontend. The application layer is intentionally straightforward — the engineering focus is on the platform around it: how services are built, deployed, secured, observed, and operated.

---

## Architecture

```
                          ┌─────────────────────────────────────┐
                          │           AKS Cluster (Azure)        │
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
| Database | PostgreSQL (StatefulSet — 4 databases: auth, products, orders, users) |
| Messaging | RabbitMQ (AMQP) |
| Containers | Docker, Docker Compose (local dev) |
| Orchestration | Kubernetes on AKS (Azure Kubernetes Service) |
| Infrastructure | Terraform (AKS cluster, networking, Key Vault) |
| CI/CD | GitHub Actions |
| GitOps | ArgoCD + Kustomize |
| Observability | Prometheus, Grafana (RED method dashboards), Jaeger (distributed tracing) |
| Tracing | OpenTelemetry SDK + OTLP HTTP → Jaeger |
| Security scanning | Trivy (image CVE scan + K8s misconfiguration scan) |
| Secrets management | External Secrets Operator (ESO) + Azure Key Vault |
| TLS | cert-manager + Let's Encrypt (HTTP-01 challenges) |
| AI / AIOps | AWS Bedrock Agent (Kira), Azure Functions + OpenAI |
| Automated review | DryRun Security, ChatGPT Codex connector |

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
│   └── Infrastructure/                # Terraform for AKS provisioning
├── gitops/
│   ├── k8s/
│   │   ├── backend/                   # Deployment + Service manifests for all services
│   │   ├── database/                  # PostgreSQL StatefulSet + restore Job
│   │   └── frontend/                  # Frontend Deployment + Service
│   ├── argo-cd.yml                    # ArgoCD Application manifest
│   ├── kustomization.yml              # Kustomize entry point
│   ├── ingress.yml                    # Ingress Nginx (boutique routes)
│   ├── cert-manager-argo.yml          # cert-manager Helm App via ArgoCD
│   └── cert-manager-clusterissuer.yml # Let's Encrypt ClusterIssuer
└── .github/
    └── workflows/
        ├── azure-ci.yml               # Main CI pipeline (build → scan → push → update manifests)
        └── trivy-pr-scan.yml          # Trivy config scan on every PR
```

---

## CI/CD Pipeline

Every push triggers the `azure-ci.yml` workflow (on `workflow_dispatch`):

```
Matrix build (8 services in parallel)
  └── Checkout code
  └── Login to DockerHub
  └── Build Docker image
  └── Trivy image scan (CRITICAL CVEs → fail)
  └── Push to DockerHub

Update manifests job (after all matrix jobs pass)
  └── sed-update image tags in gitops/k8s/ manifests
  └── Commit + push → ArgoCD auto-syncs to AKS
```

PRs are also gated by `trivy-pr-scan.yml` which runs a Trivy misconfiguration scan against `gitops/` and fails on any CRITICAL Kubernetes misconfigurations.

---

## Security

### Pod Security Contexts
Every pod in the cluster has explicit security contexts at both pod and container level:

- `runAsNonRoot: true` on all pods
- `runAsUser: 1000` for Node.js services, `999` for PostgreSQL and RabbitMQ
- `allowPrivilegeEscalation: false` on all containers
- `capabilities.drop: [ALL]` on all containers
- `readOnlyRootFilesystem: true` on Node.js services (false only where runtime writes are required: product-service, RabbitMQ, PostgreSQL, Jaeger)

### Secrets Management
All sensitive values are stored in Azure Key Vault and surfaced into the cluster via External Secrets Operator (ESO). The `boutique-secrets` Kubernetes Secret is entirely managed by ESO — no hardcoded credentials anywhere in the manifests.

Required Key Vault secrets:
- `boutique-DB-PASSWORD`, `boutique-JWT-SECRET`
- `boutique-RABBITMQ-USER`, `boutique-RABBITMQ-PASSWORD`, `boutique-RABBIT-URL`
- `boutique-RESEND-API-KEY`, `boutique-ADMIN-EMAIL`

### Trivy Scanning
Two-layer security gate:
1. **Image scan** in CI — blocks push on any CRITICAL CVE in a built image
2. **Config scan on PRs** — blocks merge on any CRITICAL Kubernetes misconfiguration (KSV rules)

### Automated PR Security Review
- **DryRun Security** — scans PRs for security anti-patterns (KQL injection, IDOR, unvalidated LLM tool calls, hardcoded credentials)
- **ChatGPT Codex connector** — automated code review on every PR

---

## Observability

### Metrics — Prometheus + Grafana
- ServiceMonitors auto-discover metrics from gateway and auth services
- Grafana dashboards provisioned as ConfigMaps (Dashboard-as-Code)
- RED method dashboards: Rate, Errors, Duration per service

### Distributed Tracing — Jaeger + OpenTelemetry
All four core services (gateway, auth, orders, product-service) are instrumented with the OpenTelemetry SDK:

- Traces exported via OTLP HTTP to `http://jaeger:4318/v1/traces`
- Auto-instrumentation covers HTTP, Express routes, and PostgreSQL queries
- Jaeger UI accessible via ingress at `/jaeger`
- End-to-end traces visible across service boundaries

### What you can see in Jaeger
- Full request path from `gateway` → `auth` → `orders` → `order-service`
- Database query spans (which SQL ran, how long it took)
- Downstream HTTP call durations
- Error propagation across service boundaries

---

## GitOps with ArgoCD

ArgoCD watches this repository and syncs the cluster state to match `gitops/`. Sync waves ensure dependencies deploy in order:

1. CRDs (cert-manager, prometheus-operator)
2. Infrastructure components (ESO, Ingress Nginx)
3. Application layer (services, database, frontend)

The CI pipeline commits updated image tags back to `gitops/k8s/` manifests after every successful build. ArgoCD detects the change and rolls out the new version automatically.

---

## Infrastructure

The AKS cluster, networking, and Azure Key Vault are provisioned with Terraform in `projects/Infrastructure/`. Key resources:

- AKS cluster with system and user node pools
- Azure Container Registry (or DockerHub for images)
- Azure Key Vault (`crud-kv`) for secrets
- Virtual Network + subnets for AKS

For the full Terraform setup, see the companion infrastructure repository: [aks-app/infrastructure](https://github.com/gitafolabi/aks-app/tree/main/infrastructure)

---

## AIOps Assistant

Two implementations of an AI-powered SRE assistant — one on AWS Bedrock, one on Azure Functions with OpenAI. Both can diagnose production incidents by querying logs, metrics, and cluster health, then generate root cause analysis and fix recommendations.

See [projects/aiops-assistant/README.md](projects/aiops-assistant/README.md) for full setup.

---

## Local Development

```bash
# Start all services locally
cd projects/boutique-microservices
docker compose up

# Services available at:
# http://localhost:3000  — frontend
# http://localhost:8080  — gateway
# http://localhost:5432  — postgres
# http://localhost:5672  — rabbitmq AMQP
# http://localhost:15672 — rabbitmq management UI
```

---

## What Was Improved

This project evolved significantly beyond its initial state. Key improvements made:

| Area | What Changed |
|------|-------------|
| **Security** | Added explicit securityContext to every pod — `runAsNonRoot`, `readOnlyRootFilesystem`, dropped all capabilities |
| **Secrets** | Migrated hardcoded credentials (RabbitMQ `guest:guest`, JWT secrets) to Azure Key Vault via ESO |
| **Tracing** | Added OpenTelemetry distributed tracing across 4 services with Jaeger backend |
| **Security scanning** | Added Trivy image scan gate in CI + Trivy config scan gate on PRs |
| **Frontend** | Revamped UI with React 19 + Material UI v7 |
| **AIOps** | Built Azure Functions version of the AIOps assistant alongside the original AWS Bedrock version |
| **AI code review** | Integrated DryRun Security + Codex automated PR review bots |
| **Node.js deprecations** | Migrated all GitHub Actions to Node.js 24 runtime |
| **RabbitMQ config** | Fixed incorrect env var names (`RABBITMQ_DEFAULT_USER/PASS`) and sourced from Key Vault |
| **AIOps security** | Fixed KQL injection, IDOR, and unvalidated LLM tool call vulnerabilities in the AIOps assistant |

---

## Intentional Issues (Bonus Challenge)

The repository includes intentional problems for learning purposes. See [projects/Issues.md](projects/Issues.md) for the full list.

Once you've deployed the system:
1. Fork this repository
2. Deploy to your own AKS or EKS cluster
3. Find and fix the issues
4. Share what you learned
