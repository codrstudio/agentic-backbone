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
# Transpile com --noCheck + declaration off. Separa type-check de emit:
# - Emit .js: rapido e barato, usa pouca memoria.
# - Type-check + .d.ts: roda separado (IDE / CI step opcional via
#   `tsc --noEmit`), nao bloqueia build.
#
# Motivo: backbone usa Hono com ~555 rotas encadeadas + ~98 Zod chains.
# Tsc full checking faz type explosion — consome >8GB e nao termina.
# --noCheck sozinho nao basta porque o tsconfig tem `declaration: true`
# e TS precisa resolver tipos inteiros pra emitir .d.ts. `--declaration=false`
# corta isso. Flag `--declarationMap=false` idem.
#
# Runtime .js emitido e' identico; app nao usa .d.ts em producao.
# NODE_OPTIONS=--max-old-space-size=8192 mantido como seguranca.
RUN NODE_OPTIONS=--max-old-space-size=8192 npm run build --workspace=apps/backbone -- --noCheck --declaration false --declarationMap false

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
