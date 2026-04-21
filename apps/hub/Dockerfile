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

# Lockfile + package.jsons pra cachear npm ci
COPY package.json package-lock.json ./
COPY apps/hub/package.json ./apps/hub/
COPY apps/backbone/package.json ./apps/backbone/

# Vendor (pacotes internos em .tgz referenciados via file:)
COPY vendor ./vendor

RUN npm ci

# Codigo do hub + tsconfig base (necessario pro tsc --noEmit do script build)
COPY tsconfig.base.json ./
COPY apps/hub ./apps/hub

# Build (tsc --noEmit && vite build) -> apps/hub/dist
RUN npm run build --workspace=apps/hub

# ── Runtime ──────────────────────────────────────────────────────────────
FROM caddy:alpine AS runtime

COPY --from=builder /app/apps/hub/dist /srv/hub
COPY apps/hub/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
