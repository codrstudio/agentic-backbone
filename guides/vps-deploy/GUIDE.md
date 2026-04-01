# Guia: Deploy na VPS

Referência para publicar o agentic-backbone (e projetos similares) em staging e production na VPS compartilhada. Baseado no modelo operacional do projeto pneu-sos.

---

## Arquitetura Geral

```
GitHub (push) → GitHub Actions (build) → ghcr.io (registry) → VPS (pull + up)
```

**Princípio:** a VPS nunca builda. Só faz pull de imagens prontas do registry.

---

## Branches e Imagens

| Branch | Trigger | Tags no ghcr.io |
|--------|---------|-----------------|
| `develop` | push | `:staging` |
| `main` | push (merge de develop) | `:latest` + `:release-{n}` |

Imagens por app:
- `ghcr.io/{org}/agentic-backbone-backbone:staging`
- `ghcr.io/{org}/agentic-backbone-hub:staging`
- `ghcr.io/{org}/agentic-backbone-chat:staging`

---

## Dockerização

### Um Dockerfile por app

Ficam em `infra/docker/{backbone,hub,chat}/Dockerfile`. O build context é sempre a **raiz do monorepo** — necessário para acessar os packages compartilhados (`packages/ai-sdk`, `packages/ai-chat`, `packages/ui`).

### Backbone (Node.js runtime)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backbone/package.json apps/backbone/
COPY apps/packages/ai-sdk/package.json apps/packages/ai-sdk/
COPY apps/packages/ai-chat/package.json apps/packages/ai-chat/
COPY apps/packages/ui/package.json apps/packages/ui/
RUN npm ci

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY apps/backbone/ apps/backbone/
COPY apps/packages/ apps/packages/
CMD ["/app/node_modules/.bin/tsx", "apps/backbone/src/index.ts"]
```

### Hub / Chat (Vite — build estático)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/hub/package.json apps/hub/
COPY apps/packages/ai-chat/package.json apps/packages/ai-chat/
COPY apps/packages/ui/package.json apps/packages/ui/
RUN npm ci
COPY tsconfig.json ./
COPY apps/hub/ apps/hub/
COPY apps/packages/ apps/packages/
RUN npm run build --workspace=apps/hub

FROM nginx:alpine
COPY --from=build /app/apps/hub/dist /usr/share/nginx/html
```

**Multi-stage:** deps numa camada, código na outra. O `npm ci` usa cache de camada porque os `package.json` mudam pouco.

---

## Estrutura na VPS

O compose de deploy fica no próprio repo. Na VPS, cada ambiente é um clone:

```
/srv/apps/h.backbone.chega.la/   ← git clone, branch develop (staging)
/srv/apps/backbone.chega.la/     ← git clone, branch main (production)
```

---

## Proxy: Traefik + Caddy

Dois níveis de reverse proxy com separação de responsabilidades:

| Camada | Escopo | Responsabilidade |
|--------|--------|------------------|
| **Traefik** | Global na VPS | TLS (Let's Encrypt), roteamento por domínio |
| **Caddy** | Local da stack | Roteamento por path (`/api/*` → backbone, `/hub/*` → hub) |

- Traefik: "qual domínio?" → encaminha pro Caddy certo
- Caddy: "qual path?" → encaminha pro serviço certo

Se houver apenas um projeto na VPS, Traefik sozinho resolve (rotas por path direto nele).

---

## Secrets: dotenvx

Criptografa `.env.staging` e `.env.production` direto no repo com chave simétrica.

- `.env.keys` fica na VPS (raiz do clone) e localmente — **nunca no git**
- Decrypt: `npx dotenvx decrypt`
- Zero dependências extras (vs SOPS/age que precisam de binários)
- Suficiente para projetos pequenos/médios. Para KMS ou rotação de chaves, usar SOPS.

---

## Portas: PREFIX para multi-tenant

Cada instância usa um `PREFIX` numérico no `.env`. Portas derivam dele:

```env
PREFIX=60
BACKBONE_PORT=6002
HUB_PORT=6005
CHAT_PORT=6006
```

No compose, usar `${BACKBONE_PORT}`, `${HUB_PORT}`, etc. Cada instância de cliente usa PREFIX diferente → portas nunca colidem.

As portas ficam na rede interna Docker (não expostas no host). Caddy fala com `backbone.internal:${BACKBONE_PORT}`.

---

## Health Checks

### Docker healthcheck (compose)

```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:${BACKBONE_PORT}/api/v1/ai/health"]
  interval: 10s
  retries: 5
```

Garante `depends_on: condition: service_healthy` — Caddy só sobe quando backbone está healthy.

### Validação manual pós-deploy

```bash
curl -sk https://backbone.chega.la/api/v1/ai/health
```

---

## SQLite: Cuidados Específicos

Diferente de Postgres (que roda em container próprio), SQLite é arquivo no filesystem.

### Volume persistente obrigatório

```yaml
volumes:
  - backbone-data:/app/data
```

O diretório `data/` (onde ficam `backbone.sqlite`, sessions, memory DBs) **não pode ficar dentro da imagem** — seria perdido no `docker compose up -d` com nova imagem.

### Context directory

O `context/` (agentes, channels, adapters) é filesystem. Duas opções:
1. **Volume montado** — dados persistem entre deploys
2. **No repo** — `git pull` atualiza junto com o código

### Limitação de concorrência

SQLite não suporta acesso concorrente de múltiplos processos. Single instance obrigatório (WAL mode já ativo). Para escalar horizontalmente, migrar para Postgres.

---

## GitHub Actions: Workflow com Matrix Strategy

Um workflow único builda todas as imagens em paralelo via matrix:

```yaml
# .github/workflows/build.yml
name: Build & Push

on:
  push:
    branches: [develop, main]
    tags: ['release-*']

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - name: backbone
            dockerfile: infra/docker/backbone/Dockerfile
          - name: hub
            dockerfile: infra/docker/hub/Dockerfile
          - name: chat
            dockerfile: infra/docker/chat/Dockerfile
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: ${{ matrix.service.dockerfile }}
          push: true
          tags: # lógica de tags abaixo
```

Lógica de tags:
- `refs/heads/develop` → `:staging`
- `refs/heads/main` → `:latest`
- `refs/tags/release-*` → `:release-N` + `:latest`

No Actions, a auth para ghcr.io é automática via `${{ secrets.GITHUB_TOKEN }}` (já vem com `packages:write`).

### Auth na VPS (ghcr.io pull)

PAT com scope `read:packages`. Login uma vez:

```bash
docker login ghcr.io -u <github-user> -p <PAT>
```

Docker salva credenciais em `~/.docker/config.json`. `docker compose pull` funciona sem re-autenticar.

---

## Traefik: Labels no Compose

Traefik detecta serviços automaticamente via Docker provider. Labels no serviço Caddy do compose:

```yaml
caddy:
  labels:
    - "traefik.enable=true"
    - "traefik.docker.network=codr-net"
    - "traefik.http.routers.backbone-${ENVIRONMENT}.rule=Host(`${PUBLIC_DOMAIN}`)"
    - "traefik.http.routers.backbone-${ENVIRONMENT}.entrypoints=websecure"
    - "traefik.http.routers.backbone-${ENVIRONMENT}.tls.certresolver=letsencrypt"
    - "traefik.http.services.backbone-${ENVIRONMENT}.loadbalancer.server.port=80"
```

Cada stack se auto-registra no Traefik. Zero config central — sobe o compose e o Traefik já roteia.

---

## Zero Downtime

Atualmente: nenhum mecanismo. `docker compose up -d` recria containers com alguns segundos de gap. Aceitável para apps B2B com poucos usuários simultâneos.

Opções futuras se necessário:
- `docker compose up -d --no-deps --wait <servico>` — recria um serviço por vez
- Blue-green com dois stacks alternando no Traefik

---

## Fluxos de Deploy

### Staging

1. Dev faz push em `develop`
2. GitHub Actions builda imagens e publica com tag `:staging`
3. Na VPS:
```bash
cd /srv/apps/h.backbone.chega.la
git pull
docker compose pull
docker compose up -d
curl -sk https://h.backbone.chega.la/api/v1/ai/health
```

### Production

1. Merge `develop` → `main`, push, criar tag:
```bash
git checkout main
git merge develop
git push origin main
git tag release-{n}
git push origin release-{n}
```
2. Actions builda `:latest` + `:release-{n}`
3. Na VPS:
```bash
cd /srv/apps/backbone.chega.la
git pull
docker compose pull
docker compose up -d
curl -sk https://backbone.chega.la/api/v1/ai/health
```

### Rollback

Imagens versionadas ficam no ghcr.io. Rollback = trocar a tag:

```bash
cd /srv/apps/backbone.chega.la
TAG=release-{n-1} docker compose pull
TAG=release-{n-1} docker compose up -d
```

O compose usa `image: ghcr.io/.../backbone:${TAG:-latest}` para aceitar override.

---

## Checklist de Setup Inicial

- [ ] Criar Dockerfiles em `infra/docker/{backbone,hub,chat}/Dockerfile`
- [ ] Criar `deploy/docker-compose.yml` com serviços, volumes e healthchecks
- [ ] Criar `deploy/Caddyfile` com rotas por path
- [ ] Criar `.github/workflows/build.yml` (CI — build + push para ghcr.io)
- [ ] Configurar `.env.staging` e `.env.production` com dotenvx
- [ ] Na VPS: clonar repo em `/srv/apps/{dominio}/`, colocar `.env.keys`
- [ ] Na VPS: configurar Traefik labels ou arquivo estático para o domínio
- [ ] Na VPS: `docker login ghcr.io` com PAT (scope `read:packages`)
- [ ] Testar fluxo completo: push develop → staging → validar → merge main → production
