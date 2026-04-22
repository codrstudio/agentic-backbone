---
title: "Processa Deploy Topology (ia-web)"
aliases: [ia-web-topology, processa-infra]
tags: [deploy, infra, processa, nginx, caddy, docker]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# Processa Deploy Topology (ia-web)

The Processa server (`ia-web`, 172.27.0.50, user `suporte`) hosts the agentic-backbone project at `/projetos/agentic-backbone/`. The topology diverges from the `processa-deploy` standard: an nginx-proxy handles the edge while an internal Caddy proxy exists but was historically never wired to the edge.

## Key Points

- **Edge layer**: `nginx-proxy` at `/projetos/proxy/` — handles HTTPS termination, Authelia forward-auth, and Let's Encrypt for `*.processa.info` domains.
- **Current vhost** (`agents.processa.info.conf`): routes directly to 3 app containers via separate `proxy_pass` directives (backbone, hub, chat).
- **Internal Caddy** (`ab-development-caddy-1`): healthy and running for weeks, but never plugged into the edge — acts as an internal reverse proxy only.
- **Migration plan (Commit B)**: replace 3 `proxy_pass` entries with a single `http://ab-<env>-caddy-1:${PUBLIC_PORT}`, then reload nginx. Only after this can `web_network` be removed from app containers.
- **Container naming**: uses `ENVIRONMENT=development` even in production — intentionally preserved because the vhost references these names (`ab-development-*`).

## Details

The agentic-backbone on ia-web was originally deployed via GitHub Actions from `codrstudio/agentic-backbone` (GitHub), pulling images tagged `:staging` from `ghcr.io/codrstudio/*`. This differs from the intended source-of-truth (`gitlab.processa.info/nic/automacao/nic-lab`, branch `ab`). As of 2026-04-21, the GitHub repo was 18 days behind the GitLab upstream, and the GHA workflow had stagnated.

The deployment has two pending steps:
1. **Commit A** (done 2026-04-21): Add internal Caddy in parallel — apps remain in `web_network` so both old direct routes and new Caddy route work simultaneously.
2. **Commit B** (pending admin): Admin swaps the nginx vhost to route all traffic through Caddy, then apps can be removed from `web_network`.

The server also runs `coletivos` (another NIC project with a Kong gateway) on `shared-net` — this cross-project network dependency must not be removed from the agentic-backbone compose.

## Related Concepts

- [[concepts/web-network-proxy-visibility]] - `web_network` controls whether nginx-proxy can reach each container
- [[concepts/caddy-hub-strip-prefix]] - Internal Caddy configuration with `uri strip_prefix` and its dependencies
- [[concepts/github-gitlab-source-divergence]] - The GitHub/GitLab sync problem affecting which source is deployed

## Sources

- [[calendar/notes/2026-04-21.md]] - SSH inspection of ia-web revealed the topology (nginx-proxy edge, Caddy internal never plugged); discovery of GHA staleness; two-phase migration decision (Variant A commit A+B)
