# agentic-backbone

Runtime autônomo multi-agente da Processa (backbone + hub + chat), deployado em [https://agents.processa.info](https://agents.processa.info).

> **Este README é provisório** — cobre só o essencial de deploy. Versão completa com arquitetura, APIs, modos de operação e onboarding de desenvolvimento será escrita depois.

---

## Ambientes

| Ambiente | URL | Auth |
|---|---|---|
| Produção | `https://agents.processa.info` | Authelia LDAP (grupo `ia_agents`) + API keys no `/api/*` |

Fluxo interno:

```
Internet
  ↓ HTTPS
nginx-proxy (/projetos/proxy, edge da Processa)
  ↓ proxy_pass único + Authelia forward-auth
ab-<env>-caddy-1:${PUBLIC_PORT}  (Caddy interno deste projeto)
  ├── /api/*       → backbone.internal:${BACKBONE_PORT}
  ├── /hub/*       → hub.internal:${HUB_PORT}
  ├── /adminer/*   → adminer.internal:8080
  ├── /            → redir /hub/
  └── /health      → 200 OK (resposta direta do Caddy)
```

---

## Stack

- **Backbone** (`apps/backbone`) — Node 22 + Hono + OpenClaude SDK, runtime autônomo
- **Hub** (`apps/hub`) — React 19 + Vite + TanStack Router + PWA (admin UI)
- **Caddy interno** — proxy reverso do projeto, unifica todos serviços numa porta pública
- **Postgres 16** + **Redis 7** + **Evolution** (WhatsApp) + **Adminer**
- Infra pattern: 3 compose files (`infra/docker-compose.yml` + `docker-compose.platform.yml` + `docker-compose.platform.dev-ports.yml`)

---

## Deploy em produção

Fonte de verdade: **`gitlab.processa.info/nic/automacao/nic-lab` branch `ab`**.

### Fluxo diário

```bash
git push upstream migrate-infra:ab
```

(ou qualquer branch que mergeie em `ab`)

Dispara automaticamente:

1. **build** (stage `build` do `.gitlab-ci.yml`) — builda `apps/hub/Dockerfile` + `apps/backbone/Dockerfile` e pusha pra `registry.processa.info/agentic-backbone/{hub,backbone}:ab-<sha>` + `:ab-latest`
2. **deploy** (stage `deploy`) — SSH em `suporte@172.27.0.50`, `git fetch + reset --hard origin/ab` em `/projetos/agentic-backbone`, `docker compose -f infra/docker-compose.yml pull && up -d --remove-orphans`, `restart caddy`

Roda em 1-10 min dependendo de cache. Logs: `http://gitlab.processa.info/nic/automacao/nic-lab/-/pipelines`.

### Verificar saúde pós-deploy

```bash
curl -sI https://agents.processa.info/api/v1/ai/health   # 200 OK (backbone via fallback API key)
curl -sI https://agents.processa.info/hub/               # 302 pra proxy.processa.info (Authelia login)
```

Access logs do edge: `docker logs nginx-proxy` no `ia-web` (172.27.0.50).

---

## Registry

Imagens vivem em **`registry.processa.info/agentic-backbone/*`** (htpasswd basic auth). User `admin`. Registry liberado em 2026-04-21.

Listar catálogo:
```bash
curl -u admin:SENHA https://registry.processa.info/v2/_catalog
```

### Histórico

| Período | Registry | Motivo |
|---|---|---|
| até 2026-04-02 | `ghcr.io/codrstudio/agentic-backbone` | build via GitHub Actions (legado, estagnado — sem sync com GitLab) |
| 2026-04-02 a 2026-04-21 | `registry.codrstudio.dev` | transitório CODR Studio, htpasswd |
| 2026-04-21 em diante | `registry.processa.info` | oficial Processa |

---

## Servidor (ia-web)

- **Host**: `172.27.0.50` (acesso via VPN Processa)
- **User**: `suporte`
- **Path**: `/projetos/agentic-backbone/`
- **Docker registry login**: já persistente em `~suporte/.docker/config.json` (ambos codrstudio e processa.info)
- **Volumes persistentes**: `/projetos/agentic-backbone/data/` — postgres, redis, evolution state, whisper cache

SSH local:
```bash
bash .claude/skills/processa-deploy/scripts/setup-local-ssh.sh
ssh iaweb                   # logado como suporte
```

---

## GitLab CI vars

Configuradas em `gitlab.processa.info/nic/automacao/nic-lab/-/settings/ci_cd` (project-level):

| Var | Tipo | Masked | Valor |
|---|---|---|---|
| `DOCKER_REGISTRY_URL` | env_var | false | `https://registry.processa.info` |
| `DOCKER_REGISTRY_USER` | env_var | false | `admin` |
| `DOCKER_REGISTRY_PASSWORD` | env_var | **false*** | (htpasswd Processa) |
| `SSH_DEPLOY_KEY` | file | false | chave privada pra `suporte@ia-web` |

\* *senha tem `#` que viola regras de masking do GitLab (só base64-safe + `@_-+=:`). Aceitável porque o CI log protege via `--password-stdin` no docker login. Quando Processa rotacionar pra base64-safe, reabilitar mask.*

Vars de destino do deploy são hardcoded no `.gitlab-ci.yml` (`VPS_IAWEB_HOST=172.27.0.50`, `VPS_IAWEB_USER=suporte`, `VPS_IAWEB_DEPLOY_FOLDER=/projetos`).

---

## Variáveis de ambiente

Ver `.env.example`. Padrão:

- Defaults Docker no topo (hosts `*.internal`, portas internas)
- Bloco `DEV OVERRIDES` no fim, comentado em prod
- Produção **não deve** ter DEV OVERRIDES ativas (regressão conhecida: força `localhost` em vars de host)

---

## Development local

```bash
npm install
npm run platform:up       # sobe postgres/redis/caddy/evolution/... via docker
npm run dev               # hub + backbone concurrent, hot-reload
```

Detalhes em `CLAUDE.md`.

---

## Skills Claude Code relacionadas

Skills que operam deploy/infra deste projeto (em `.claude/skills/`):

- `processa-deploy` — fluxo de deploy, troubleshooting, migração de registry
- `dockerization` — estrutura `infra/` e 3 compose files
- `reverse-proxy` — padrão Caddy interno por projeto
- `env-pattern` — camadas do `.env`
- `vpn-processa` — VPN L2TP L2TP pra alcançar `172.27.0.50`
