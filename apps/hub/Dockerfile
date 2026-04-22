# apps/hub/Dockerfile
# Multi-stage: node builder (Vite) -> caddy runtime servindo dist/ estatico.
# Baseado no template Dockerfile.frontend da skill processa-deploy.
#
# Build:
#   docker compose build hub
#
# O hub e' SPA (Vite + TanStack Router + PWA). O Caddy interno deste container
# serve o dist/ na porta 80. O Caddy de infra (service `caddy` em platform.yml)
# faz reverse_proxy /hub/* -> hub.internal:80.

# syntax=docker/dockerfile:1.7

FROM node:22-slim AS builder
WORKDIR /app

# Lockfile + package.jsons
COPY package.json package-lock.json ./
COPY apps/hub/package.json ./apps/hub/
COPY apps/backbone/package.json ./apps/backbone/

# Vendor (pacotes internos em .tgz referenciados via file:)
COPY vendor ./vendor

# O package-lock.json do repo foi gerado em Windows e cacheia optional
# deps platform-specific daquele SO. npm install (mesmo com
# --include=optional) preserva o lockfile existente e nao baixa os
# optional deps do Linux (ex: @rollup/rollup-linux-x64-gnu).
# Bug conhecido: https://github.com/npm/cli/issues/4828
# Fix: remover o lockfile antes de npm install, forcando regeneracao
# no env atual (Linux). Long-term: regenerar e commitar o lockfile em
# Linux no repo, voltar pra npm ci.
RUN rm -f package-lock.json && npm install --include=optional --no-audit --no-fund

# Codigo do hub + tsconfig base (necessario pro tsc --noEmit do script build)
COPY tsconfig.base.json ./
COPY apps/hub ./apps/hub

# Build (tsc --noEmit && vite build) -> apps/hub/dist
RUN npm run build --workspace=apps/hub

# ── Runtime ──────────────────────────────────────────────────────────────
FROM caddy:alpine AS runtime

COPY --from=builder /app/apps/hub/dist /srv/hub
COPY apps/hub/Caddyfile /etc/caddy/Caddyfile

# Porta interna definida pelo env HUB_PORT (convencao do projeto: .env manda).
# Dockerfile so documenta via EXPOSE (nao binda — o Caddy binda via Caddyfile).
EXPOSE ${HUB_PORT}
