---
title: "Caddy strip_prefix and Vite base Path Dependency"
aliases: [strip-prefix-bug, hub-base-path, caddy-hub-path]
tags: [caddy, vite, hub, deploy, routing, bug]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# Caddy strip_prefix and Vite base Path Dependency

The hub service is served under the `/hub/` path prefix. For this to work correctly, two configurations must be aligned: (1) Caddy must strip the `/hub` prefix before forwarding requests to the hub container, and (2) Vite must be built with `base: '/hub/'` so all asset URLs are relative to that prefix.

## Key Points

- **Caddy directive**: `uri strip_prefix /hub` must appear in the Caddy route for `path /hub/*` — without it, the hub container receives paths like `/hub/assets/index.js` and `try_files` fails to find the file.
- **Vite config**: `base: '/hub/'` in `vite.config.ts` causes Vite to prefix all asset references with `/hub/`. This config was present in the GitHub mirror but was lost from the GitLab upstream.
- **Encadeamento**: Both must be present simultaneously — Caddy strips the prefix at the proxy layer; Vite embeds the prefix in the HTML/JS at build time. If either is absent, routing breaks.
- **Restoration rule**: Restoring a config that production already depends on is not "scope creep" — it is a necessary restoration, not a new feature or quality improvement.
- **Validation status**: As of 2026-04-21, the Caddy + strip_prefix + vite base chain was validated by reasoning only (app TypeScript errors and rollup build failure prevented a live smoke test).

## Details

The bug was discovered during agent-to-agent review: the `apps/hub/Caddyfile` was missing `uri strip_prefix /hub`. Without it, a request for `/hub/index.html` reaches the hub container as `/hub/index.html`, but the container's document root only contains `index.html` — so the file is not found and `try_files` falls back to the catch-all, causing incorrect behavior.

The linked `base: '/hub/'` in `vite.config.ts` is necessary because when the SPA loads, it generates asset `<script src="/hub/assets/index-[hash].js">` URLs. If the base is absent (or set to `/`), those paths resolve to `/assets/…` which nginx/Caddy won't route to the hub container.

This config was present in `codrstudio/agentic-backbone` (GitHub) but had been lost from `upstream/ab` (GitLab). Since the production image was still built from GitHub at the time of the session, the running container had the correct base — making this a "restoration of lost config" rather than a new feature introduction.

## Related Concepts

- [[concepts/processa-deploy-topology]] - The Caddy proxy sits inside the deploy topology as the internal router
- [[concepts/github-gitlab-source-divergence]] - The config was present in GitHub mirror but lost from GitLab upstream
- [[concepts/web-network-proxy-visibility]] - Network layer that enables the proxy to reach the hub container

## Sources

- [[calendar/notes/2026-04-21.md]] - Bug found by agent `nic` during review; `uri strip_prefix /hub` fix applied; `base: '/hub/'` restoration decision and rationale documented
