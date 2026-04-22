# Knowledge Base Index

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|
| [[concepts/processa-deploy-topology]] | Topologia do ia-web: nginx-proxy edge + Caddy interno, migração em 2 fases (web_network), container names com ENVIRONMENT=development | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/caddy-hub-strip-prefix]] | `uri strip_prefix /hub` no Caddy e `base: '/hub/'` no Vite devem estar sincronizados; ambos ausentes quebram o roteamento do hub | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/web-network-proxy-visibility]] | `web_network` controla visibilidade no nginx-proxy; remover antes do Commit B corta produção; `shared-net` é cross-projeto com coletivos | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/npm-rollup-cross-platform-lockfile]] | package-lock.json gerado no Windows omite `@rollup/rollup-linux-x64-gnu`; `npm ci` em Linux falha; fix: regenerar em Linux ou `--include=optional` | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/github-gitlab-source-divergence]] | GitHub 18 dias atrás do GitLab; GHA estagnado; imagens de prod vinham do GitHub; `base: '/hub/'` foi perdido no GitLab durante o drift | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/runtime-source-of-truth]] | Usar `docker exec … cat <config>` como fonte da verdade ao investigar deploy legado; restaurar config que prod depende não é scope creep | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[connections/caddy-vite-base-divergence]] | O bug do Caddy strip_prefix expôs que `base: '/hub/'` estava ausente no GitLab — causalidade entre bug de proxy e divergência de repo | calendar/notes/2026-04-21.md | 2026-04-21 |
