---
title: "Connection: Caddy strip_prefix and GitHub/GitLab Divergence"
connects:
  - "concepts/caddy-hub-strip-prefix"
  - "concepts/github-gitlab-source-divergence"
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# Connection: Caddy strip_prefix and GitHub/GitLab Divergence

## The Connection

The `uri strip_prefix /hub` Caddy directive and the `base: '/hub/'` Vite config are a tightly coupled pair — both are required for hub path routing to work. The GitLab upstream (`upstream/ab`) was missing `base: '/hub/'` because repo divergence between GitHub and GitLab caused the config to be lost. This means the Caddy bug discovery and the divergence investigation are causally linked.

## Key Insight

A Caddy configuration bug (`uri strip_prefix /hub` missing) was the trigger that led to discovering that `base: '/hub/'` was missing from the Vite config on the GitLab side — which in turn revealed the GitHub/GitLab divergence. Neither bug was visible until the Caddy fix forced inspection of the full path chain. The two-repo divergence silently hid a production-critical config loss until a proxy-level bug exposed the gap.

## Evidence

- Agent `nic` caught the missing `uri strip_prefix /hub` during Caddyfile review.
- Fixing Caddy immediately required validating that the Vite build would produce `/hub/`-prefixed asset URLs — which required `base: '/hub/'` in `vite.config.ts`.
- Checking `vite.config.ts` on the GitLab upstream showed the config was absent — but present on the GitHub mirror.
- This led to the wider discovery: GitHub was 18 days behind, the GHA had stagnated, and the GitLab side had silently lost the config at some point during the drift.

## Related Concepts

- [[concepts/caddy-hub-strip-prefix]] - The Caddy + Vite base path dependency
- [[concepts/github-gitlab-source-divergence]] - The repo sync gap that caused the config loss
- [[concepts/runtime-source-of-truth]] - How inspecting the running container confirmed the expected behavior
