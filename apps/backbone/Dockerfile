# syntax=docker/dockerfile:1.7
# apps/backbone/Dockerfile
# Multi-stage: node builder -> node runtime.
# Node 22-slim + apt-get (python3/make/g++) pra native modules
# (better-sqlite3, bcrypt, etc) — template skill `Dockerfile.backend`
# usa alpine, mas mantemos slim aqui porque funciona com prod atual.

FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backbone/package.json apps/backbone/
# vendor/ tem os pacotes @codrstudio/openclaude-{sdk,chat} referenciados via file:
COPY vendor ./vendor
RUN npm ci

COPY tsconfig.base.json .
COPY apps/backbone/src apps/backbone/src
COPY apps/backbone/tsconfig.json apps/backbone/
# tsc em monorepo grande consome muito heap. Default V8 ~1.5GB, tentativa
# anterior com 4GB estourou (Ineffective mark-compacts — heap saturado,
# GC nao libera). 8GB ainda e' um workaround — root cause parece ser
# type explosion, recomendacao long-term e' usar esbuild/swc no build e
# rodar tsc --noEmit so pra type check.
RUN NODE_OPTIONS=--max-old-space-size=8192 npm run build --workspace=apps/backbone

FROM node:22-slim
WORKDIR /app

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/backbone/node_modules apps/backbone/node_modules
COPY --from=builder /app/apps/backbone/dist apps/backbone/dist
COPY --from=builder /app/apps/backbone/package.json apps/backbone/
RUN mkdir -p apps/backbone/context

WORKDIR /app/apps/backbone
EXPOSE ${BACKBONE_PORT:-6002}
CMD ["node", "dist/index.js"]
