---
title: "Processa Deploy SSH Inspection Bootstrap"
aliases: [ssh-bootstrap, setup-local-ssh, iaweb-ssh, deploy-inspection]
tags: [ssh, deploy, processa, infra, ops, bootstrap]
sources:
  - "calendar/notes/2026-04-22.md"
created: 2026-04-22
updated: 2026-04-22
---

# Processa Deploy SSH Inspection Bootstrap

The `processa-deploy` skill includes a script (`scripts/setup-local-ssh.sh`) that idempotently configures the local machine for SSH access to ia-web. Once run, all server inspection is done via `ssh iaweb '<command>'` — no ad-hoc credentials, no IP addresses to remember, no interactive prompts. Pre-deploy investigation of any existing `/projetos/<app>/` directory is mandatory before running `docker compose up -d`.

## Key Points

- **Script**: `bash <skill>/scripts/setup-local-ssh.sh` — idempotent; safe to run multiple times. Sets up `~/.ssh/` with host key, a `Host iaweb` config block, and a keypair.
- **Key source priority**: (1) GitLab group `SSH_DEPLOY_KEY` variable fetched via `GITLAB_ACCESS_TOKEN`; (2) new keypair generated locally if not available.
- **Result**: `ssh iaweb 'cmd'` works immediately after setup — alias resolves to `172.27.0.50`, user `suporte`, correct identity file.
- **Mandatory pre-deploy investigation**: Any pre-existing `/projetos/<app>/` directory must be inspected before running compose commands. Never `docker compose up -d` on unknown server state.
- **Investigation checklist includes**: container runtime state, Caddyfile from running container (`docker exec … cat /etc/caddy/Caddyfile`), `.env` active values, `git remote -v` output, and `docker network inspect web_network` membership.

## Details

The setup script addresses the friction of first-time SSH configuration: which key to use, what host alias to define, whether the server's host key is trusted. Running it once produces a `~/.ssh/config` block like:

```
Host iaweb
  HostName 172.27.0.50
  User suporte
  IdentityFile ~/.ssh/iaweb_deploy
  StrictHostKeyChecking yes
```

This means subsequent commands are `ssh iaweb 'docker ps'` rather than `ssh -i ~/.ssh/some-key suporte@172.27.0.50 'docker ps'`. The idempotency guarantee means the script can be re-run after a key rotation without adverse effects — it overwrites rather than appending duplicate config blocks.

The pre-deploy investigation requirement exists because ia-web is a shared server with projects that may have been bootstrapped by different people at different times. Assumptions about ownership, environment variable values, git remotes, or network membership can all be wrong. The 2026-04-21 session documented four specific ways those assumptions failed (`root:root` ownership, DEV OVERRIDES active, git remote pointing to GitHub, docker login missing). The correct approach is to read the actual server state via SSH before issuing any `compose up` command.

The runtime Caddyfile inspection (`docker exec ab-development-caddy-1 cat /etc/caddy/Caddyfile`) is particularly important: the running container's config may be ahead of the repo, meaning a naive `docker compose up -d` with the repo's Caddyfile would silently downgrade a production config. See [[concepts/runtime-source-of-truth]] for the general principle.

## Related Concepts

- [[concepts/processa-deploy-bootstrap-pitfalls]] - The failure modes that make pre-deploy investigation mandatory
- [[concepts/runtime-source-of-truth]] - Why reading from the running container is essential during investigation
- [[concepts/processa-deploy-topology]] - The ia-web server being accessed via SSH

## Sources

- [[calendar/notes/2026-04-22.md]] - Session (13:21): `bash <skill>/scripts/setup-local-ssh.sh` documented as idempotent; key source priority (GitLab group SSH_DEPLOY_KEY → generate); `Host iaweb` alias; pre-deploy investigation mandatory for pre-existing directories
