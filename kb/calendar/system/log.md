# Knowledge Base Build Log

Append-only chronological log of all compile runs.

---

## [2026-04-22T19:40:00-03:00] compile | 2026-04-22.md

- Source: [[calendar/notes/2026-04-22.md]]
- Articles created:
  - [[concepts/nginx-proxy-certbot-ssl-sync]]
  - [[concepts/processa-deploy-ssh-bootstrap]]
  - [[concepts/deploy-only-ci-pattern-risks]]
- Articles updated:
  - [[concepts/processa-deploy-topology]] — nginx-proxy cert path (`/projetos/proxy/nginx/certs/`) added; Authelia forward-auth noted
  - [[concepts/runtime-source-of-truth]] — HTML asset path comparison as staleness diagnostic added

---

## [2026-04-22T19:24:00-03:00] compile | 2026-04-21.md (second pass)

- Source: [[calendar/notes/2026-04-21.md]]
- Articles created:
  - [[concepts/hono-type-explosion]]
  - [[concepts/gitlab-ci-variable-patterns]]
  - [[concepts/processa-deploy-bootstrap-pitfalls]]
  - [[concepts/client-infra-vendor-naming]]
- Articles updated:
  - [[concepts/npm-rollup-cross-platform-lockfile]] — `rm package-lock.json && npm install` fix detail; npm issue #4828; live CI confirmation
  - [[concepts/processa-deploy-topology]] — Commit B executed (nginx vhost → Caddy); registry migration ghcr.io → registry.processa.info; Commit C identified as remaining debt
  - [[concepts/github-gitlab-source-divergence]] — Registry migration history added; active CI now from GitLab nic-lab

---

## [2026-04-21T23:59:00-03:00] compile | 2026-04-21.md

- Source: [[calendar/notes/2026-04-21.md]]
- Articles created:
  - [[concepts/processa-deploy-topology]]
  - [[concepts/caddy-hub-strip-prefix]]
  - [[concepts/web-network-proxy-visibility]]
  - [[concepts/npm-rollup-cross-platform-lockfile]]
  - [[concepts/github-gitlab-source-divergence]]
  - [[concepts/runtime-source-of-truth]]
  - [[connections/caddy-vite-base-divergence]]
- Articles updated: (none — first compile)
