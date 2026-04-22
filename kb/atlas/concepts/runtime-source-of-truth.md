---
title: "Runtime as Source of Truth for Legacy Deploy Investigation"
aliases: [runtime-truth, container-config-inspection, legacy-deploy-investigation]
tags: [deploy, debugging, principle, docker, caddy, infra]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# Runtime as Source of Truth for Legacy Deploy Investigation

When investigating or preparing a legacy deployment, the running container's actual configuration is the most reliable source of truth — more so than documentation, skills, or source code that may have drifted. Reading config directly from a running container (`docker exec … cat /etc/caddy/Caddyfile`) reveals what the system actually expects, not what someone intended.

## Key Points

- **Primary method**: `docker exec <container> cat <config-path>` to read the live configuration file directly from a running container — not from git history or documentation.
- **When to apply**: Any time you are preparing a migration, refactor, or deployment update for a system with an unknown history. The running state is authoritative.
- **Restoration vs. scope creep**: Applying a config that the running system already depends on is a *restoration*, not a new feature. This overrides "don't fix app bugs" rules because the config is a production dependency, not a quality improvement.
- **`docker exec` pattern**: `docker exec ab-development-caddy-1 cat /etc/caddy/Caddyfile` revealed the production path routing aligned with the `reverse-proxy` skill — crystallized immediately rather than guessing.
- **Image baking smell**: If a running container serves unexpected content (e.g., the nginx "Welcome to nginx" default page), the image may have implicit config baked in. Inspect with `docker exec` before assuming the config is wrong.

## Details

During the 2026-04-21 session, the agent inspected `ia-web` via SSH and ran `docker exec ab-development-caddy-1 cat /etc/caddy/Caddyfile`. This revealed that the production Caddy config already had path-based routing for `/backbone/*`, `/hub/*`, and had previously included `/chat/*` — matching the `reverse-proxy` skill's prescribed pattern. Instead of reinventing the Caddyfile from scratch, the agent crystallized the running config as the base and extended it.

The principle extends beyond Caddyfiles. When a container serves unexpected content (the hub's nginx container was found to be serving the nginx default landing page, not the hub SPA), `docker exec` into the container can show what files are actually present versus what the config expects. This revealed an "image baked with implicit config" smell — the internal Caddyfile was doing a redirect from `/` to `/hub/`, masking the nginx container's actual content.

The corollary for config restoration: if the running production image depends on a configuration that is missing from the source repo, restoring that config to the repo is a mandatory restoration — not an out-of-scope change. The `base: '/hub/'` vite.config.ts case is the canonical example from this session.

## Related Concepts

- [[concepts/caddy-hub-strip-prefix]] - The Caddy config that was crystallized from the running container
- [[concepts/processa-deploy-topology]] - The deployment environment where this principle was applied

## Sources

- [[calendar/notes/2026-04-21.md]] - Principle articulated: `docker exec` to read live Caddyfile; restoration of `base: '/hub/'` as exception to "don't fix app" rule; nginx-default landing page as "implicit config smell"
