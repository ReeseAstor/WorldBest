## Infrastructure Deep Dive

### Local Dev (Docker Compose)

- Services: Postgres, MongoDB, Redis, RabbitMQ, MinIO, Nginx, Web, Prometheus, Grafana
- Healthchecks and dependency graph ensure correct boot order

```1:40:/workspace/worldbest/docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    # ...
```

### API Gateway (Nginx)

- Terminates requests, routes to services (auth, project, ai)
- Static config in `infrastructure/nginx/*`

### Observability

- Prometheus configured via `infrastructure/prometheus/prometheus.yml`
- Grafana provisioned dashboards in `infrastructure/grafana/provisioning`

### Kubernetes (Planned/Partial)

- Manifests under `infrastructure/k8s/` for namespace, configmap, secrets, deployments
- Ingress to be added; CI deploy via GitHub Actions

### Security

- Secrets via env and K8s secrets; JWT for auth; RBAC in services

