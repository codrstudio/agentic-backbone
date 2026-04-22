# agentic-backbone

> Runtime autônomo multi-agente da Processa — **backbone + hub** deployado em [agents.processa.info](https://agents.processa.info).

[![Registry](https://img.shields.io/badge/registry-registry.processa.info-blue)](https://registry.processa.info)
[![Source of Truth](https://img.shields.io/badge/gitlab-nic%2Fautomacao%2Fnic--lab%20%40%20ab-orange)](http://gitlab.processa.info/nic/automacao/nic-lab)
[![Deploy](https://img.shields.io/badge/deploy-CI%20%E2%86%92%20ia--web-brightgreen)](http://gitlab.processa.info/nic/automacao/nic-lab/-/pipelines)

> **Este README cobre operação e deploy.** Documentação completa de arquitetura, APIs, modos de operação e onboarding de desenvolvimento será escrita depois. Por enquanto, detalhes de runtime e convenções de código vivem em [`CLAUDE.md`](CLAUDE.md).

---

## Sumário

- [O que é](#o-que-é)
- [Ambientes](#ambientes)
- [Stack](#stack)
- [Arquitetura de rede](#arquitetura-de-rede)
- [Deploy em produção](#deploy-em-produção)
- [Registry Docker](#registry-docker)
- [Servidor (ia-web)](#servidor-ia-web)
- [GitLab CI — variáveis](#gitlab-ci--variáveis)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Desenvolvimento local](#desenvolvimento-local)
- [Skills Claude Code relacionadas](#skills-claude-code-relacionadas)

---

## O que é

Plataforma interna para rodar agentes de IA autônomos na Processa. Expõe um **hub** administrativo (React/PWA) e um **backbone** (Node + OpenClaude SDK) que executa agentes em três modos: conversation, heartbeat e cron. Integrações prontas: Postgres, Redis, Evolution (WhatsApp), Twilio.

---

## Ambientes

| Ambiente  | URL                              | Auth                                                        |
| --------- | -------------------------------- | ----------------------------------------------------------- |
| Produção  | `https://agents.processa.info`   | Authelia LDAP (grupo `ia_agents`) + API keys em `/api/*`    |

---

## Stack

| Camada            | Tecnologia                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| Backbone          | Node 22, Hono, OpenClaude SDK — runtime autônomo (`apps/backbone`)          |
| Hub               | React 19, Vite, TanStack Router, PWA — admin UI (`apps/hub`)                |
| Proxy interno     | Caddy — unifica todos os serviços numa porta pública (`PUBLIC_PORT`)        |
| Dados             | Postgres 16 · Redis 7 · Evolution (WhatsApp) · Adminer                      |
| Orquestração      | 3 compose files em `infra/` (veja [dockerization](#skills-claude-code-relacionadas)) |

```
infra/
├── docker-compose.yml                    # serviços do produto (backbone, hub, caddy)
├── docker-compose.platform.yml           # plataforma (postgres, redis, evolution, adminer)
└── docker-compose.platform.dev-ports.yml # overlay dev: expõe portas no host
```

---

## Arquitetura de rede

```
                       Internet
                          │  HTTPS
                          ▼
             nginx-proxy  (/projetos/proxy, edge da Processa)
                          │  proxy_pass único + Authelia forward-auth + Let's Encrypt
                          ▼
              ab-<env>-caddy-1 : ${PUBLIC_PORT}        (Caddy interno do projeto)
                          │
     ┌────────────────────┼────────────────────┬───────────────────────┐
     │                    │                    │                       │
     ▼                    ▼                    ▼                       ▼
 /api/*              /hub/*              /adminer/*                 /  →  redir /hub/
 backbone.internal   hub.internal        adminer.internal           /health → 200 OK
 :${BACKBONE_PORT}   :${HUB_PORT}        :8080                      (resposta direta do Caddy)
```

Pattern: **cada projeto embarca seu próprio Caddy** como proxy reverso interno; o edge da Processa (`nginx-proxy`) faz apenas HTTPS + Authelia e encaminha para 1 única porta do projeto.

---

## Deploy em produção

Fonte de verdade: **`gitlab.processa.info/nic/automacao/nic-lab` branch `ab`**.

### Fluxo diário

```bash
git push upstream migrate-infra:ab
```

(ou qualquer branch que mergeie em `ab`)

O push dispara automaticamente:

1. **`build`** — builda `apps/hub/Dockerfile` + `apps/backbone/Dockerfile` e pusha para
   `registry.processa.info/agentic-backbone/{hub,backbone}:ab-<sha>` + `:ab-latest`.
2. **`deploy`** — SSH em `suporte@172.27.0.50`, faz `git fetch && reset --hard origin/ab`
   em `/projetos/agentic-backbone`, depois:
   ```bash
   docker compose -f infra/docker-compose.yml pull
   docker compose -f infra/docker-compose.yml up -d --remove-orphans
   docker compose -f infra/docker-compose.yml restart caddy
   ```

Tempo típico: **1–10 min** dependendo de cache.
Logs: [pipelines do CI](http://gitlab.processa.info/nic/automacao/nic-lab/-/pipelines).

### Verificar saúde pós-deploy

```bash
# Backbone OK (via fallback API key)
curl -sI https://agents.processa.info/api/v1/ai/health     # → 200 OK

# Hub exige login Authelia
curl -sI https://agents.processa.info/hub/                 # → 302 proxy.processa.info
```

Access logs do edge:

```bash
ssh iaweb
docker logs nginx-proxy
```

---

## Registry Docker

Imagens vivem em **`registry.processa.info/agentic-backbone/*`** (htpasswd basic auth, user `admin`). Registry liberado em **2026-04-21**.

### Listar catálogo

```bash
curl -u admin:SENHA https://registry.processa.info/v2/_catalog
```

### Histórico de registries

| Período                      | Registry                                      | Motivo                                                       |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| até 2026-04-02               | `ghcr.io/codrstudio/agentic-backbone`         | build via GitHub Actions (legado, estagnado — sem sync com GitLab) |
| 2026-04-02 → 2026-04-21      | `registry.codrstudio.dev`                     | transitório CODR Studio, htpasswd                            |
| 2026-04-21 →                 | `registry.processa.info`                      | **oficial Processa**                                         |

---

## Servidor (ia-web)

| Campo              | Valor                                                       |
| ------------------ | ----------------------------------------------------------- |
| Host               | `172.27.0.50` (acesso somente via VPN Processa)             |
| Usuário            | `suporte`                                                   |
| Path do projeto    | `/projetos/agentic-backbone/`                               |
| Volumes persistes  | `/projetos/agentic-backbone/data/` — postgres, redis, evolution state, whisper cache |
| Docker login       | já persistente em `~suporte/.docker/config.json` (codrstudio + processa.info) |

### Atalho SSH local

```bash
bash .claude/skills/processa-deploy/scripts/setup-local-ssh.sh
ssh iaweb                   # logado como suporte
```

> Perdeu VPN? Use a skill `/vpn-processa` para reconectar.

---

## GitLab CI — variáveis

Configuradas em `gitlab.processa.info/nic/automacao/nic-lab/-/settings/ci_cd` (project-level):

| Variável                  | Tipo     | Masked   | Valor                                      |
| ------------------------- | -------- | -------- | ------------------------------------------ |
| `DOCKER_REGISTRY_URL`     | env_var  | false    | `https://registry.processa.info`           |
| `DOCKER_REGISTRY_USER`    | env_var  | false    | `admin`                                    |
| `DOCKER_REGISTRY_PASSWORD`| env_var  | false\*  | (htpasswd Processa)                        |
| `SSH_DEPLOY_KEY`          | file     | false    | chave privada pra `suporte@ia-web`         |

\* *senha contém `#` e viola as regras de masking do GitLab (só base64-safe + `@_-+=:`). Aceitável porque o CI protege via `--password-stdin` no `docker login`. Quando a Processa rotacionar pra uma senha base64-safe, reabilitar masking.*

> Vars de destino de deploy são **hardcoded** em `.gitlab-ci.yml`:
> `VPS_IAWEB_HOST=172.27.0.50`, `VPS_IAWEB_USER=suporte`, `VPS_IAWEB_DEPLOY_FOLDER=/projetos`.

---

## Variáveis de ambiente

Ver `.env.example`. Convenção em camadas:

1. **Defaults Docker no topo** — hosts `*.internal`, portas internas.
2. **Bloco `# DEV OVERRIDES`** no fim, **comentado em produção**.
3. Produção **nunca** deve ter DEV OVERRIDES ativas — regressão conhecida: força `localhost` em vars de host e quebra o service discovery interno do Caddy.

Skill relacionada: `/env-pattern`.

---

## Desenvolvimento local

```bash
npm install
npm run platform:up       # sobe postgres, redis, caddy, evolution via docker
npm run dev               # hub + backbone em paralelo, hot-reload
```

Comandos mais finos (backbone só, hub só, testes de capabilities, secrets, etc.) estão em [`CLAUDE.md`](CLAUDE.md).

---

## Skills Claude Code relacionadas

Skills que operam este projeto (disponíveis no Claude Code):

| Skill               | Para quê                                                           |
| ------------------- | ------------------------------------------------------------------ |
| `processa-deploy`   | Fluxo de deploy, troubleshooting, migração de registry             |
| `dockerization`     | Estrutura `infra/` e o pattern dos 3 compose files                 |
| `reverse-proxy`     | Pattern de Caddy interno por projeto                               |
| `env-pattern`       | Convenção das camadas do `.env` (defaults Docker + DEV OVERRIDES)  |
| `vpn-processa`      | VPN L2TP para alcançar `172.27.0.50`                               |

---

<sub>Source of truth: `gitlab.processa.info/nic/automacao/nic-lab` branch `ab`. Runtime host: `ia-web` (172.27.0.50). Registry: `registry.processa.info`.</sub>
