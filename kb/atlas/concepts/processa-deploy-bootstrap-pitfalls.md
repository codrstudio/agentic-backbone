---
title: "Processa Deploy Bootstrap Pitfalls"
aliases: [bootstrap-checklist, ia-web-bootstrap, deploy-gotchas]
tags: [deploy, processa, docker, infra, bootstrap, ops]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# Processa Deploy Bootstrap Pitfalls

First-time setup of a project directory on `ia-web` (Processa server) has several failure modes that are not covered by the `processa-deploy` skill checklist. These were discovered during the 2026-04-21 live deploy: wrong ownership on the project root directory, active DEV OVERRIDES in the production `.env`, `git remote` pointing to the wrong upstream, and missing `docker login`. Each silently breaks the deploy in a different way.

## Key Points

- **Root ownership**: `/projetos/agentic-backbone` was created as `root:root` while internal files are `suporte:suporte`. `chown -R suporte:suporte /projetos/agentic-backbone` skips the directory itself — must run `chown suporte:suporte /projetos/agentic-backbone` (without `-R`) separately to fix the mount point.
- **DEV OVERRIDES in prod `.env`**: The `.env` template includes a `DEV OVERRIDES` block intended for local development. If left uncommented on the server (e.g. `PROXY_UPSTREAM=host.docker.internal`), Caddy tries to `reverse_proxy` to a host that does not exist in the container network. Fix: `sed -i '/DEV OVERRIDES/,/═══/{ /^[A-Z]/s/^/# / }'` to comment out the block after deploy.
- **Git remote pointing to GitHub**: Directories bootstrapped from a clone or copied from a GHA-managed environment may have `origin` pointing to `github.com/codrstudio/...` instead of the GitLab source-of-truth. Fix: `git remote set-url origin http://gitlab.processa.info/...` — HTTP anonymous pull works for nic-lab without credentials.
- **Missing `docker login`**: The CI pipeline pushes to `registry.processa.info` but the server must also be authenticated to pull images. `docker login registry.processa.info` with the registry credentials must be run once on the server before `docker compose pull` will work.
- **`docker` group membership**: The `suporte` user must be in the `docker` group on ia-web to run Docker commands without `sudo`. Verify with `id suporte`; add with `usermod -aG docker suporte`.

## Details

These pitfalls fall into two categories: one-time server bootstrap errors and templating mistakes that survive from dev to prod.

The ownership issue is subtle because `chown -R` traverses children but the command is called on the directory itself. When the directory mount point is `root:root` and Docker tries to bind-mount files into it as `suporte`, permission errors appear inside the container rather than at the compose level, making the root cause non-obvious.

The DEV OVERRIDES problem is a templating design issue: the `.env` includes development convenience variables in the same file as production settings. The release notes for the 2026-04-21 deploy explicitly listed "comment DEV OVERRIDES after deploy" as a required step, but it was not performed during bootstrap. The result was `PROXY_UPSTREAM=host.docker.internal` active in production, which caused Caddy to attempt upstream connections to the Docker host's loopback — a host that does not exist inside the container network on the server.

The git remote issue arises from the project's history: ia-web was previously managed via GHA triggered from `codrstudio/agentic-backbone` (GitHub). The directory on the server was cloned from GitHub; no one ever updated the remote to point to the GitLab source-of-truth. Because nic-lab is publicly readable via HTTP, changing the remote URL to the GitLab HTTP URL is safe and does not require SSH key setup on the server.

## Related Concepts

- [[concepts/processa-deploy-topology]] - The ia-web server topology and directory structure
- [[concepts/github-gitlab-source-divergence]] - Why git remote pointed to GitHub (legacy GHA history)
- [[concepts/gitlab-ci-variable-patterns]] - The CI variables and credentials needed for docker login

## Sources

- [[calendar/notes/2026-04-21.md]] - Session (21:00) live deploy: root:root ownership on /projetos/agentic-backbone; DEV OVERRIDES uncommented in prod .env causing Caddy proxy failure; git remote pointing to GitHub; docker login missing; each failure mode documented with fix commands
