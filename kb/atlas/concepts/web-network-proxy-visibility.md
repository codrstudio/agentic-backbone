---
title: "Docker web_network and Proxy Visibility"
aliases: [web-network, docker-network-proxy, shared-net]
tags: [docker, networking, proxy, caddy, nginx-proxy, infra]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# Docker web_network and Proxy Visibility

In the Processa deployment, `web_network` is the Docker network that connects app containers to the `nginx-proxy` edge. A container must be on `web_network` for `nginx-proxy` to see it and route traffic to it. Removing a container from `web_network` before the vhost is updated severs external access entirely.

## Key Points

- **`web_network`**: external Docker network used by `nginx-proxy` (the Processa edge). Any container not on this network is invisible to the proxy and cannot receive external traffic.
- **Migration gate**: Apps can only be removed from `web_network` *after* the admin updates the nginx vhost to route all traffic through the internal Caddy container (Commit B). Removing it prematurely cuts off production.
- **Mandatory check**: `docker network inspect web_network` must be run before any vhost swap to confirm which containers are connected.
- **`shared-net`**: a separate Docker network shared with the `coletivos` project (Kong gateway — `coletivos-development-kong-1`). This is a cross-project dependency that must never be removed from the agentic-backbone compose.
- **Two-phase migration (Variant A)**: Commit A adds Caddy to `web_network` in parallel; Commit B removes app containers from `web_network` only after the nginx vhost is switched to Caddy.

## Details

The Processa deployment uses two named Docker networks with distinct purposes. `web_network` is managed externally (by the nginx-proxy project at `/projetos/proxy/`) and is the transport layer for all reverse-proxy routing. When an app container joins this network, nginx-proxy can discover it via container name and forward matching requests. This is why `ENVIRONMENT=development` in the production `.env` is intentional: the vhost `proxy_pass` directives reference hostnames like `ab-development-backbone-1`, which Docker resolves via `web_network` DNS.

`shared-net`, by contrast, is a project-internal network shared with `coletivos`. It provides cross-project service discovery (e.g., the Kong gateway). Removing agentic-backbone containers from `shared-net` would break inter-project routing in ways that are not immediately visible from the agentic-backbone codebase alone.

The safe migration sequence for transitioning from direct-container routing to Caddy-based routing:
1. Add Caddy to `web_network` (Commit A — done).
2. Admin updates nginx vhost to a single `proxy_pass` to Caddy.
3. Verify traffic flows through Caddy.
4. Remove backbone/hub from `web_network` (Commit B — pending).

## Related Concepts

- [[concepts/processa-deploy-topology]] - The full Processa server topology and migration plan
- [[concepts/caddy-hub-strip-prefix]] - The internal Caddy config that becomes the sole entry point after migration

## Sources

- [[calendar/notes/2026-04-21.md]] - Lesson: `web_network` not neutral; `docker network inspect web_network` mandatory before vhost swap; `shared-net` cross-project dependency with `coletivos` documented; two-phase migration (Variant A) rationale
