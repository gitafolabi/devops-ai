# DevOps AI — Boutique Microservices Platform

A production-grade microservices platform deployed on Azure Kubernetes Service, built to demonstrate real-world DevOps, SRE, and AI-assisted engineering practices end-to-end. The project covers everything from local Docker Compose development through Kubernetes deployment, GitOps automation, security hardening, full-stack observability, and AI-powered incident response.

---

## Architecture

```
                    ┌──────────────────────────────────────────────────┐
                    │              AKS Cluster (Azure)                  │
                    │  Namespace: boutique                              │
                    │                                                   │
Browser ──► Ingress │  Gateway (:3001) ──► Auth (:3002)               │
 HTTPS/TLS   Nginx  │       │                                          │
                    │       ├──► Product Service (:3003)               │
                    │       ├──► Orders (:3005) ──► Order Service(:3004)│
                    │       ├──► User Service (:3006)                  │
                    │       └──► Notification Service                  │
                    │                                                   │
                    │  PostgreSQL StatefulSet (4 databases)             │
                    │  RabbitMQ (AMQP :5672, Management :15672)        │
                    │                                                   │
                    │  Jaeger (:16686)   Prometheus   Grafana          │
                    └──────────────────────────────────────────────────┘
                                      ▲
                            ArgoCD (GitOps sync)
                                      ▲
                        GitHub (this repo — gitops/ branch)
                                      ▲
                          GitHub Actions (CI/CD pipelines)
```

---

## Services

| Service | Port | Role |
|---------|------|------|
| `gateway` | 3001 | API gateway — routes all traffic, JWT middleware, Prometheus metrics, OTel tracing |
| `auth` | 3002 | Registration, login, JWT issuance — PostgreSQL `auth_db`, RabbitMQ publisher, OTel tracing |
| `product-service` | 3003 | Product catalog CRUD, image uploads (multer + sharp) — PostgreSQL `products_db`, OTel tracing |
| `orders` | 3005 | Order placement — PostgreSQL `orders_db`, RabbitMQ publisher, OTel tracing |
| `order-service` | 3004 | Order processing — RabbitMQ consumer, PostgreSQL `orders_db` |
| `user-service` | 3006 | User profiles — PostgreSQL `users_db`, JWT validation |
| `notification-service` | — | Email dispatch — RabbitMQ consumer, Nodemailer/Resend |
| `frontend` | 3000 | React 19 SPA — Material UI v7, React Router 7, Axios |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19.2, Material UI v7.3.7, React Router 7 |
| Backend | Node.js / TypeScript, Express 4 |
| Database | PostgreSQL 15-alpine (StatefulSet — 4 databases) |
| Messaging | RabbitMQ 3-management-alpine (AMQP) |
| Containers | Docker, Docker Compose (local dev) |
| Orchestration | Kubernetes on AKS (Azure Kubernetes Service) |
| Infrastructure | Terraform — [aks-app/infrastructure](https://github.com/gitafolabi/aks-app/tree/main/infrastructure) |
| CI/CD | GitHub Actions (Azure → DockerHub, AWS → ECR) |
| GitOps | ArgoCD + Kustomize |
| Distributed Tracing | Jaeger 1.56 + OpenTelemetry SDK (OTLP HTTP) |
| Metrics | Prometheus + Grafana (kube-prometheus-stack v85.0.1) |
| Security Scanning | Trivy — image CVE scan + K8s misconfiguration scan |
| Secrets Management | External Secrets Operator (ESO) + Azure Key Vault |
| TLS | cert-manager v1.14.5 + Let's Encrypt (HTTP-01) |
| AIOps | AWS Bedrock Agent (Kira) + Azure Functions + OpenAI GPT-4o |
| Automated PR Review | DryRun Security, ChatGPT Codex connector |

---

## Repository Structure

```
devops-ai/
├── README.md
├── docs/
│   ├── part1-system-design.md       # 12 DevOps system design pillars
│   └── part2-workflow.md            # End-to-end workflow overview
├── projects/
│   ├── boutique-microservices/
│   │   ├── backend/services/        # 7 Node.js/TypeScript services
│   │   └── frontend/                # React 19 + Material UI v7
│   ├── aiops-assistant/             # AIOps assistant (AWS Bedrock + Azure Functions)
│   └── Infrastructure/              # Terraform (AWS EKS reference modules)
├── gitops/
│   ├── kustomization.yml            # Kustomize entry point — all resources
│   ├── cluster-secret-store.yml     # ESO ClusterSecretStore → Azure Key Vault
│   ├── external-secret.yml          # ExternalSecret → boutique-secrets K8s Secret
│   ├── argo-cd.yml                  # ArgoCD Application manifest
│   ├── cert-manager-argo.yml        # cert-manager Helm app via ArgoCD
│   ├── cert-manager-clusterissuer.yml
│   ├── ingres-argo.yml              # Ingress Nginx via ArgoCD
│   └── k8s/
│       ├── backend/                 # Deployments + Services for all 7 services + Jaeger + RabbitMQ
│       ├── database/                # PostgreSQL StatefulSet, ConfigMap, restore Job
│       ├── frontend/                # Frontend Deployment + Service
│       ├── grafana-dashboard.yml    # RED method dashboard (ConfigMap)
│       ├── hpa.yml                  # HorizontalPodAutoscalers
│       ├── ingress.yml              # Boutique app ingress routes
│       ├── monitoring-ingress.yml   # Grafana + AlertManager routes
│       └── tools-ingress.yml        # Jaeger + RabbitMQ management routes
└── .github/
    └── workflows/
        ├── azure-ci.yml             # Main CI — DockerHub, Trivy scan, manifest update
        ├── aws-ci.yml               # AWS CI — ECR build and push
        └── trivy-pr-scan.yml        # PR gate — Trivy config scan on gitops/
```

---

## CI/CD Pipelines

### Azure Pipeline (`azure-ci.yml`) — Active
Triggers on `workflow_dispatch`. Builds all 8 services in parallel via matrix:

```
For each service (auth, gateway, orders, order-service,
                  product-service, user-service, notification-service, frontend):
  1. Build Docker image
  2. Trivy image scan — CRITICAL CVEs → fail, block push
  3. Push to DockerHub

After all matrix jobs pass:
  4. sed-update image tags in gitops/k8s/ manifests
  5. Commit + push → ArgoCD detects change → rolls out new version
```

### AWS Pipeline (`aws-ci.yml`) — Reference
Same structure but pushes to Amazon ECR. Builds 7 services (no notification-service). No Trivy image scan step.

### PR Security Gate (`trivy-pr-scan.yml`)
Triggers on every pull request. Scans `gitops/` for Kubernetes misconfigurations. Any CRITICAL finding (KSV rules) blocks the merge via required status checks on the `main` branch.

---

## Observability

### Distributed Tracing — Jaeger + OpenTelemetry
Four services are instrumented with the OpenTelemetry Node.js SDK:

| Service | Instrumented spans |
|---------|-------------------|
| `gateway` | HTTP incoming/outgoing, Express routes (excludes `/metrics` scrape noise) |
| `auth` | HTTP, Express, PostgreSQL queries |
| `orders` | HTTP, Express, PostgreSQL queries |
| `product-service` | HTTP, Express, PostgreSQL queries |

Traces are exported via OTLP HTTP to `http://jaeger:4318/v1/traces`. The Jaeger UI is accessible at `https://jaeger.test.chellrach.com` and shows full cross-service request chains including SQL query spans and TCP connection timing.

### Metrics — Prometheus + Grafana
- **ServiceMonitors** auto-discover metrics from `gateway` and `auth`
- **Grafana dashboards** provisioned as ConfigMaps (Dashboard-as-Code)
- **RED method** — Rate, Errors, Duration per service
- **AlertManager** accessible at `https://alerts.test.chellrach.com`
- **Grafana** accessible at `https://grafana.test.chellrach.com`

---

## Security

### Pod Security Contexts
All service pods have explicit securityContext at both pod and container level:
- `runAsNonRoot: true`, `runAsUser: 1000` on all Node.js services
- `readOnlyRootFilesystem: true` on all Node.js services (false only where runtime writes are required: product-service for image uploads, RabbitMQ, Jaeger)
- `allowPrivilegeEscalation: false` on all containers
- `capabilities.drop: [ALL]` on all containers

PostgreSQL runs without a forced securityContext — the official image entrypoint requires root at startup to chown the data directory before dropping to the `postgres` user internally.

### Secrets Management
All credentials live in Azure Key Vault (`crud-kv`) and are synced to the cluster via External Secrets Operator:

```
Azure Key Vault (crud-kv)
        │  refreshInterval: 1h
        ▼
ClusterSecretStore (azure-kv, ServicePrincipal auth)
        ▼
ExternalSecret (boutique namespace)
        ▼
boutique-secrets K8s Secret
        ▼
Pods consume via secretKeyRef
```

Secrets managed: `POSTGRES_PASSWORD`, `AUTH_DB_URL`, `PRODUCTS_DB_URL`, `ORDERS_DB_URL`, `USERS_DB_URL`, `RABBIT_URL`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

No credentials exist in this repository.

### Trivy Security Gates
| Gate | Trigger | What it scans | Failure action |
|------|---------|---------------|----------------|
| Image scan | Every CI build | Docker image CVEs | Blocks image push |
| Config scan | Every PR | `gitops/` K8s manifests | Blocks PR merge |

### Automated PR Security Review
- **DryRun Security** — scans for KQL injection, IDOR, unvalidated LLM tool calls, hardcoded credentials
- **ChatGPT Codex connector** — automated code review on every PR

---

## GitOps with ArgoCD

ArgoCD watches this repository and reconciles cluster state to `gitops/`. Resources deploy in sync waves:

1. Namespace + secrets (ESO ExternalSecret creates `boutique-secrets`)
2. cert-manager CRDs, prometheus-operator CRDs
3. Infrastructure — Ingress Nginx, ESO, cert-manager
4. Application layer — services, database, frontend, Jaeger

The CI pipeline commits updated image tags back to `gitops/k8s/` manifests. ArgoCD detects the change within 3 minutes and performs a rolling update.

---

## Infrastructure

The AKS cluster, networking, and Azure Key Vault are provisioned with Terraform. The Terraform configuration lives in a separate repository:

**[github.com/gitafolabi/aks-app/tree/main/infrastructure](https://github.com/gitafolabi/aks-app/tree/main/infrastructure)**

The `projects/Infrastructure/` directory in this repo contains AWS EKS Terraform modules (VPC, EKS cluster, ECR repositories, ArgoCD) used as a reference for the AWS deployment variant.

---

## AIOps Assistant

An AI-powered SRE assistant that diagnoses production incidents by querying logs, metrics, and cluster health — then generates root cause analysis and fix recommendations. Two implementations:

| | AWS Version (Kira) | Azure Version |
|--|--|--|
| AI runtime | AWS Bedrock Agent | OpenAI GPT-4o via Azure Functions |
| Log source | CloudWatch Logs | Azure Monitor / Log Analytics |
| Metrics | Prometheus (ELB) | Azure Monitor Metrics |
| Health check | EKS DescribeCluster + Prometheus | AKS + Prometheus |
| UI | Streamlit | HTTP endpoints |

See [projects/aiops-assistant/README.md](projects/aiops-assistant/README.md) for full setup.

The Azure version includes hardened security: KQL injection prevention, allowlisted LLM tool calls, and IDOR protection on resource ID validation.

---

## Local Development

```bash
cd projects/boutique-microservices
docker compose up

# Services:
# http://localhost:3000  — frontend
# http://localhost:3001  — gateway
# http://localhost:3002  — auth
# http://localhost:3003  — product-service
# http://localhost:5432  — postgres
# http://localhost:5672  — rabbitmq AMQP
# http://localhost:15672 — rabbitmq management UI
```

---

## Branch Protection

The `main` branch is protected with:
- Required status check: `trivy-config-scan` must pass before merge
- Branches must be up to date before merging
- Force pushes blocked
- Deletions blocked
- Squash merge only (keeps `main` history clean)

---

## What Was Improved

| Area | Change |
|------|--------|
| **Secrets** | Migrated all credentials from plaintext `secrets.yml` to Azure Key Vault via ESO |
| **Tracing** | Added OpenTelemetry to 4 services — full cross-service traces visible in Jaeger |
| **Security scanning** | Added Trivy image CVE gate in CI + Trivy config scan gate on every PR |
| **Pod security** | `runAsNonRoot`, `readOnlyRootFilesystem`, `capabilities.drop: ALL` on all Node.js containers |
| **Metrics noise** | Excluded `/metrics` Prometheus scrape from OTel traces in gateway |
| **Frontend** | Revamped UI with React 19 + Material UI v7 |
| **RabbitMQ credentials** | Fixed incorrect env var names (`RABBITMQ_DEFAULT_USER/PASS`), sourced from Key Vault |
| **AIOps security** | Fixed KQL injection, IDOR, unvalidated LLM tool call vulnerabilities |
| **Node.js deprecations** | Migrated all GitHub Actions to Node.js 24 runtime |
| **Branch protection** | Required status checks, squash-only merge, force push blocked |

---

## Intentional Issues (Bonus Challenge)

The repository includes intentional problems for learning. See [projects/Issues.md](projects/Issues.md) for the list.

Deploy the system, find the issues, fix them, and share what you learned.
