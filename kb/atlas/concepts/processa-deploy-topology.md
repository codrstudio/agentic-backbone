---
title: "Processa Deploy Topology (ia-web)"
aliases: [ia-web-topology, processa-infra]
tags: [deploy, infra, processa, nginx, caddy, docker]
sources:
  - "calendar/notes/2026-04-21.md"
  - "calendar/notes/2026-04-22.md"
created: 2026-04-21
updated: 2026-04-22

---

# Processa Deploy Topology (ia-web)

The Processa server (`ia-web`, 172.27.0.50, user `suporte`) hosts the agentic-backbone project at `/projetos/agentic-backbone/`. The topology diverges from the `processa-deploy` standard: an nginx-proxy handles the edge while an internal Caddy proxy exists but was historically never wired to the edge.

## Key Points

- **Edge layer**: `nginx-proxy` at `/projetos/proxy/` — handles HTTPS termination, Authelia forward-auth, and Let's Encrypt for `*.processa.info` domains.
- **Current vhost** (`agents.processa.info.conf`): routes directly to 3 app containers via separate `proxy_pass` directives (backbone, hub, chat).
- **Internal Caddy** (`ab-development-caddy-1`): healthy and running for weeks, but never plugged into the edge — acts as an internal reverse proxy only.
- **Commit B (executed 2026-04-21)**: Admin swapped the nginx vhost from 3 direct `proxy_pass` entries to a single `http://ab-development-caddy-1:6000` + Authelia forward-auth per path. Zero-downtime reload via `nginx -s reload`. Traffic now flows through Caddy.
- **Commit C (pending)**: After Commit B, `backbone` and `hub` can be removed from `web_network` in `infra/docker-compose.yml` — only `caddy` needs to remain on that network.
- **Container naming**: uses `ENVIRONMENT=development` even in production — intentionally preserved because the vhost references these names (`ab-development-*`).

## Details

The agentic-backbone on ia-web was originally deployed via GitHub Actions from `codrstudio/agentic-backbone` (GitHub), pulling images tagged `:staging` from `ghcr.io/codrstudio/*`. This differs from the intended source-of-truth (`gitlab.processa.info/nic/automacao/nic-lab`, branch `ab`). As of 2026-04-21, the GitHub repo was 18 days behind the GitLab upstream, and the GHA workflow had stagnated.

The migration completed in three phases:
1. **Commit A** (done 2026-04-21): Add internal Caddy in parallel — apps remained in `web_network` so both old direct routes and new Caddy route worked simultaneously.
2. **Commit B** (done 2026-04-21): Admin swapped the nginx vhost to route all traffic through Caddy (`ab-development-caddy-1:6000`). Authelia forward-auth preserved per-path. Reload zero-downtime.
3. **Commit C** (pending): Remove `backbone` and `hub` from `web_network` in `infra/docker-compose.yml` — only `caddy` needs it now.

The image registry also migrated in the same session: images moved from `ghcr.io/codrstudio/*:staging` (GitHub-built) to `registry.processa.info/agentic-backbone` (GitLab CI-built), with an intermediate stop at `registry.codrstudio.dev` that was superseded when Processa provisioned their own registry.

The server also runs `coletivos` (another NIC project with a Kong gateway) on `shared-net` — this cross-project network dependency must not be removed from the agentic-backbone compose.

## Related Concepts

- [[concepts/web-network-proxy-visibility]] - `web_network` controls whether nginx-proxy can reach each container
- [[concepts/caddy-hub-strip-prefix]] - Internal Caddy configuration with `uri strip_prefix` and its dependencies
- [[concepts/github-gitlab-source-divergence]] - The GitHub/GitLab sync problem affecting which source is deployed
- [[concepts/nginx-proxy-certbot-ssl-sync]] - SSL cert path gap between certbot and nginx-proxy on this server

## Sources

- [[calendar/notes/2026-04-21.md]] - SSH inspection revealed topology; two-phase migration planned (Commit A+B); Session (21:00) executed Commit B (admin nginx vhost swap to Caddy); registry migrated from ghcr.io → registry.processa.info; Commit C (remove web_network from apps) identified as remaining debt
- [[calendar/notes/2026-04-22.md]] - Session (13:21): nginx-proxy cert path (`/projetos/proxy/nginx/certs/live/<domain>/`) distinguished from certbot path (`/etc/letsencrypt/live/<domain>/`); Authelia forward-auth documented as present in HTTPS vhost template
