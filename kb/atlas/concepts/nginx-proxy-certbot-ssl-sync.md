---
title: "nginx-proxy SSL Certificate Sync (certbot → nginx-proxy)"
aliases: [certbot-sync, nginx-certs, privkey-rename, ssl-deploy-hook]
tags: [ssl, certbot, nginx-proxy, infra, processa, ops]
sources:
  - "calendar/notes/2026-04-22.md"
created: 2026-04-22
updated: 2026-04-22
---

# nginx-proxy SSL Certificate Sync (certbot → nginx-proxy)

`certbot` and `nginx-proxy` use different certificate directory layouts, so a successful certificate renewal does not automatically make the new cert available to nginx-proxy. A manual copy (or a deploy-hook) is required to bridge the two paths. Without it, certificates expire silently inside nginx-proxy even though certbot has renewed them.

## Key Points

- **certbot output path**: `/etc/letsencrypt/live/<domain>/` — `fullchain.pem` + `privkey.pem`.
- **nginx-proxy expected path**: `/projetos/proxy/nginx/certs/live/<domain>/` — `fullchain.pem` + `private.key` (note the rename).
- **Required rename**: `privkey.pem` → `private.key`. The copy command must rename the file: `cp -L /etc/letsencrypt/live/<domain>/privkey.pem /projetos/proxy/nginx/certs/live/<domain>/private.key`.
- **`cp -L` flag**: follows symlinks — required because certbot uses symlinks inside `/etc/letsencrypt/live/` that point to versioned files in `/etc/letsencrypt/archive/`.
- **Auto-renewal gap**: `certbot renew` (cron or systemd timer) refreshes `/etc/letsencrypt/` but does NOT touch the nginx-proxy cert path. Without intervention, nginx-proxy keeps serving the old cert until it expires.
- **Correct fix**: deploy-hook in `/etc/letsencrypt/renewal-hooks/deploy/` — a shell script that certbot runs automatically after each successful renewal. It should copy both `fullchain.pem` and rename `privkey.pem → private.key`, then run `docker exec nginx-proxy nginx -s reload`.

## Details

nginx-proxy is a Dockerized reverse proxy that discovers vhosts and SSL certificates from a bind-mounted directory on the host (`/projetos/proxy/nginx/certs/`). It expects the certificate and private key to be present at well-known paths under that mount. certbot, however, stores its output under `/etc/letsencrypt/` using a different naming convention — `privkey.pem` instead of `private.key`.

When a certificate is first issued, someone must manually perform the `cp -L` command to populate the nginx-proxy cert directory. For subsequent renewals (every ~60 days by default), the same copy must be repeated. Without a deploy-hook, every renewal cycle requires a manual intervention or the cert expires in nginx-proxy's view.

The deploy-hook approach is the correct long-term solution. Any executable script placed in `/etc/letsencrypt/renewal-hooks/deploy/` is automatically invoked by certbot after a successful renewal (but not on dry-run or staging runs). The script runs as root, so it has access to both `/etc/letsencrypt/` and `/projetos/proxy/`. After copying the files, it must reload nginx inside the container — `docker exec <nginx-proxy-container> nginx -s reload` — so the new cert is picked up without a full container restart. As of 2026-04-22, this hook does not exist on ia-web and the copy is manual.

## Related Concepts

- [[concepts/processa-deploy-topology]] - ia-web topology where nginx-proxy and certbot coexist
- [[concepts/processa-deploy-bootstrap-pitfalls]] - Other first-time setup gaps on ia-web

## Sources

- [[calendar/notes/2026-04-22.md]] - Session (13:21): cert path mismatch documented; `privkey.pem → private.key` rename requirement; `cp -L` flag explained; deploy-hook in `/etc/letsencrypt/renewal-hooks/deploy/` identified as the correct fix; hook missing on ia-web as of 2026-04-22
