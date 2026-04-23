# Knowledge Base Index

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|
| [[concepts/processa-deploy-topology]] | Topologia do ia-web: nginx-proxy edge + Caddy interno, migração em 2 fases (web_network), container names com ENVIRONMENT=development | calendar/notes/2026-04-21.md, calendar/notes/2026-04-22.md | 2026-04-22 |
| [[concepts/caddy-hub-strip-prefix]] | `uri strip_prefix /hub` no Caddy e `base: '/hub/'` no Vite devem estar sincronizados; ambos ausentes quebram o roteamento do hub | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/web-network-proxy-visibility]] | `web_network` controla visibilidade no nginx-proxy; remover antes do Commit B corta produção; `shared-net` é cross-projeto com coletivos | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/npm-rollup-cross-platform-lockfile]] | package-lock.json gerado no Windows omite `@rollup/rollup-linux-x64-gnu`; `npm ci` em Linux falha; fix: regenerar em Linux ou `--include=optional` | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/github-gitlab-source-divergence]] | GitHub 18 dias atrás do GitLab; GHA estagnado; imagens de prod vinham do GitHub; `base: '/hub/'` foi perdido no GitLab durante o drift | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/runtime-source-of-truth]] | Usar `docker exec … cat <config>` como fonte da verdade ao investigar deploy legado; restaurar config que prod depende não é scope creep | calendar/notes/2026-04-21.md, calendar/notes/2026-04-22.md | 2026-04-22 |
| [[connections/caddy-vite-base-divergence]] | O bug do Caddy strip_prefix expôs que `base: '/hub/'` estava ausente no GitLab — causalidade entre bug de proxy e divergência de repo | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/hono-type-explosion]] | 555 rotas Hono + 98 chains Zod = type aggregation explosiva; workaround `tsc --noCheck`; fix arquitetural: `const app: Hono = new Hono()` | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/gitlab-ci-variable-patterns]] | Vars em project-level nic-lab (id 275); nomes canônicos `DOCKER_REGISTRY_*`; masking rejeita `#`; `SSH_DEPLOY_KEY` como file type | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/processa-deploy-bootstrap-pitfalls]] | Armadilhas no primeiro deploy em ia-web: root:root ownership, DEV OVERRIDES ativas, git remote apontando pro GitHub, docker login ausente | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/client-infra-vendor-naming]] | Variáveis em infra de cliente não carregam nome de fornecedor; vendor no valor (URL) é OK, no nome da var não é | calendar/notes/2026-04-21.md | 2026-04-21 |
| [[concepts/nginx-proxy-certbot-ssl-sync]] | certbot renova `/etc/letsencrypt/` mas nginx-proxy lê `/projetos/proxy/nginx/certs/`; `privkey.pem → private.key`; deploy-hook é o fix correto | calendar/notes/2026-04-22.md | 2026-04-22 |
| [[concepts/processa-deploy-ssh-bootstrap]] | `setup-local-ssh.sh` configura `Host iaweb` idempotentemente; inspeção pré-deploy obrigatória para diretórios pré-existentes em ia-web | calendar/notes/2026-04-22.md | 2026-04-22 |
| [[concepts/deploy-only-ci-pattern-risks]] | Deploy-only CI falha silenciosamente quando build CI aponta para mirror desatualizado; GHA no GitHub 18 dias atrás do GitLab | calendar/notes/2026-04-22.md | 2026-04-22 |
| [[concepts/authelia-sso-integration]] | Hybrid auth: Authelia injeta Remote-* headers → `/auth/sso`; bootstrap mode exige exclusão do `system` na checagem de sysadmin | calendar/notes/2026-04-22.md | 2026-04-22 |
| [[concepts/dist-only-container-patch]] | Patch emergencial em container sem source: `sed -i` no dist compilado + restart; `docker inspect` revela path do compose file | calendar/notes/2026-04-22.md | 2026-04-22 |
