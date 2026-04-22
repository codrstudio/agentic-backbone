---
title: "GitHub/GitLab Source Divergence (agentic-backbone)"
aliases: [repo-sync, github-mirror, gitlab-upstream, gha-stagnated]
tags: [git, github, gitlab, ci, deploy, source-of-truth]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# GitHub/GitLab Source Divergence (agentic-backbone)

The agentic-backbone project has two remotes: `codrstudio/agentic-backbone` on GitHub (used for GitHub Actions builds) and `gitlab.processa.info/nic/automacao/nic-lab` branch `ab` (the designated source-of-truth for Processa). As of 2026-04-21, GitHub was 18 days behind GitLab and had no active sync — making the GitHub-built images on `ghcr.io` stale relative to the upstream.

## Key Points

- **Source-of-truth**: `upstream/ab` (GitLab Processa nic-lab) is the authoritative source for the agentic-backbone project for Processa deployments.
- **GitHub status**: `codrstudio/agentic-backbone` is a mirror/fork that had been used for GHA builds. GHA stagnated 18 days before 2026-04-21; no automated sync exists.
- **Production images**: Images running in prod on ia-web were built from GitHub and tagged `:staging` on `ghcr.io/codrstudio/*` — not from the GitLab upstream.
- **Config loss**: The GitLab upstream (`upstream/ab`) was missing `base: '/hub/'` in `vite.config.ts` — a config that existed on GitHub and that the running production image depended on. This is a concrete example of divergence causing a hidden regression.
- **Registry**: GHCR (`ghcr.io`) is accepted as a valid alternative to the Processa registry. The `processa-deploy` / `gitlab-ci.yml` skill is registry-agnostic via CI group vars.

## Details

The divergence between GitHub and GitLab was discovered during SSH inspection of ia-web: the running container was built from GitHub, but the designated source was GitLab. No automated sync (GitHub → GitLab or vice versa) was in place. The GHA workflow on `codrstudio/agentic-backbone` had not run in 18 days.

This divergence caused a subtle config regression: `base: '/hub/'` in `vite.config.ts` was present on the GitHub side but absent from the GitLab side. Had a fresh deployment been made from GitLab, the Vite build would have produced assets without the `/hub/` prefix, breaking path routing in the browser. The config was restored to the GitLab upstream as part of the 2026-04-21 session.

The org has an open decision: establish a proper sync between GitHub and GitLab, or explicitly deprecate one remote and standardize on the other. Continuing to let them drift creates the risk of further silent regressions when the "wrong" remote is used for a build.

## Related Concepts

- [[concepts/processa-deploy-topology]] - ia-web topology and which remote feeds production images
- [[concepts/caddy-hub-strip-prefix]] - The specific config lost during divergence (`base: '/hub/'`)

## Sources

- [[calendar/notes/2026-04-21.md]] - Discovered GitHub 18 days behind GitLab; production images from `ghcr.io/codrstudio/:staging` via GitHub GHA; `base: '/hub/'` loss documented; org open question on sync/deprecate decision
