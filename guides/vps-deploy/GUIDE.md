# Deploy — Agentic Backbone

## Infraestrutura

| Item | Valor |
|------|-------|
| VPS | `31.97.250.133` (root, SSH key) |
| Production | `ab.codr.studio` — `/srv/apps/ab.codr.studio` |
| Staging | `h.ab.codr.studio` — `/srv/apps/h.ab.codr.studio` |
| Registry | `ghcr.io/gugacoder/agentic-backbone/{backbone,hub,chat}` |
| CI | GitHub Actions (`build.yml`) — builda no push de `develop` e `main` |
| Proxy | Traefik global (TLS via Let's Encrypt) → Caddy por stack |

Convenção de domínio staging: `h.{domain}` (ex: `h.ab.codr.studio`).

## Princípio

**A VPS nunca builda.** Build é pesado e compete por recursos com produção. A VPS só faz `pull` de imagens prontas e `up`.

```
push → GitHub Actions (build) → ghcr.io → VPS (pull + up)
```

---

## Branches e Tags

| Branch | Propósito | Tag no ghcr.io |
|--------|-----------|----------------|
| `develop` | Trabalho diário | `:staging` |
| `main` | Código aprovado | `:latest` + `:release-{n}` |

Tags `release-{n}` marcam versões promovidas a produção e servem para rollback.

---

## Estrutura do projeto

### Dockerfiles (build)

Ficam junto das apps. Build context é sempre a **raiz do monorepo**.

| App | Dockerfile | Base | Porta interna |
|-----|-----------|------|---------------|
| backbone | `apps/backbone/Dockerfile` | node:22-slim | `${BACKBONE_PORT}` (6002) |
| hub | `apps/hub/Dockerfile` | nginx:alpine | 80 |
| chat | `apps/chat/Dockerfile` | nginx:alpine | 80 |

### `deploy/` (VPS)

Pasta commitada no repo. Na VPS, `docker compose` roda de dentro dela.

```
deploy/
  docker-compose.yml   ← compose de VPS (pull-only, sem build:)
  Caddyfile            ← roteamento por path
  .env                 ← secrets (NÃO commitado, criado manualmente)
  data/                ← volumes persistentes (postgres, redis, backbone)
  env/
    staging.env        ← template .env staging (sem secrets reais)
    production.env     ← template .env production (sem secrets reais)
```

### `docker-compose.yml` (raiz)

Compose de **desenvolvimento/CI**. Tem `build:` + `image:`. Usado por:
- `npm run docker:build` — build local ou CI
- `npm run docker:up` — teste local com containers

---

## Arquitetura Docker (VPS)

```
Traefik (*.codr.studio, TLS)
  └─ Caddy :80 (único serviço na codr-net)
       ├─ /api/*    → backbone.internal:${BACKBONE_PORT}
       ├─ /hub/*    → hub.internal:80
       ├─ /chat/*   → chat.internal:80
       ├─ /health   → "OK"
       └─ /         → redirect /hub/
```

Todos os serviços na rede `internal`. Caddy é a única ponte com `codr-net` (Traefik).

---

## Fluxos

### 1. Deploy em Staging

**Pré-requisitos (one-time, ver seção "Setup inicial"):**
1. Repo clonado em `/srv/apps/h.ab.codr.studio`
2. `deploy/.env` com secrets reais
3. Credentials plaintext em `context/credentials/` (backbone auto-encripta)
4. `docker login ghcr.io` feito na VPS

**Fluxo:**

```
1. Developer faz push em develop
       ↓
2. GitHub Actions dispara build.yml:
   - Build das 3 imagens em paralelo (matrix):
     - apps/backbone/Dockerfile → ghcr.io/.../backbone:staging
     - apps/hub/Dockerfile      → ghcr.io/.../hub:staging
     - apps/chat/Dockerfile     → ghcr.io/.../chat:staging
   - Push para ghcr.io
       ↓
3. SSH na VPS:
   cd /srv/apps/h.ab.codr.studio
   git pull origin develop
       ↓
4. cd deploy
   docker compose pull
       ↓
5. docker compose up -d
       ↓
6. Validação:
   curl -sk https://h.ab.codr.studio/health
   curl -sk https://h.ab.codr.studio/api/v1/ai/health
   curl -sk -o /dev/null -w "%{http_code}" https://h.ab.codr.studio/hub/
   curl -sk -o /dev/null -w "%{http_code}" https://h.ab.codr.studio/chat/
```

### 2. Promover para Production

```bash
# Local:
git checkout main
git merge develop
git push origin main
git tag release-{n}
git push --tags

# Aguardar Actions buildar :latest + :release-{n}

# Na VPS:
cd /srv/apps/ab.codr.studio
git pull origin main
cd deploy
docker compose pull
docker compose up -d

# Validação:
curl -sk https://ab.codr.studio/health
curl -sk https://ab.codr.studio/api/v1/ai/health
```

### 3. Rollback

```bash
cd /srv/apps/ab.codr.studio
git checkout release-{n-1}
cd deploy
TAG=release-{n-1} docker compose pull
TAG=release-{n-1} docker compose up -d
```

### 4. Validação pós-deploy

```bash
/health                  → OK
/api/v1/ai/health        → {"status":"ok"}
/hub/                    → 200 (tela de login)
/chat/                   → 200 (tela de login)

# Login (via curl):
curl -sk -X POST https://{dominio}/api/v1/ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@mail.com","password":"(Keep1Safe)"}'
# → {"token":"eyJ..."}
```

---

## Setup inicial da VPS (one-time)

### 1. Clonar

```bash
git clone git@github.com:gugacoder/agentic-backbone.git /srv/apps/<dominio>
cd /srv/apps/<dominio>
git checkout <branch>   # develop para staging, main para prod
```

### 2. Criar deploy/.env

```bash
cp deploy/env/<ambiente>.env deploy/.env
```

Preencher os secrets. Para gerar JWT_SECRET e ENCRYPTION_KEY:

```bash
# Na VPS (sem Node.js):
openssl rand -base64 48 | tr -d '\n/+='

# Ou com Node.js disponível:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Variáveis obrigatórias no `.env`:

| Variável | Descrição |
|----------|-----------|
| `ENVIRONMENT` | `staging` ou `production` |
| `PUBLIC_DOMAIN` | domínio público (ex: `h.ab.codr.studio`) |
| `JWT_SECRET` | chave para assinar JWT tokens |
| `ENCRYPTION_KEY` | chave para encriptar campos sensíveis em YAMLs |
| `BACKBONE_PORT` | porta do Node.js (default: 6002) |
| `POSTGRES_PASSWORD` | senha do Postgres |

### 3. Configurar credentials de usuário

O backbone auto-encripta campos sensíveis (password, token, key, secret) nos YAMLs. Basta colocar valores em **plaintext** — ao iniciar, o backbone detecta e encripta com a `ENCRYPTION_KEY` do `.env`.

**Importante:** se a `ENCRYPTION_KEY` mudar, os valores `ENC(...)` existentes não descriptografam. Nesse caso, substituir os valores encriptados por plaintext e reiniciar o backbone.

Exemplo — criar/resetar senha do usuário system:

```bash
cat > context/credentials/users/system.yml << 'EOF'
type: user-password
password: "(Keep1Safe)"
EOF
# Reiniciar backbone para auto-encriptar:
cd deploy && docker compose restart backbone
```

Após reinício, o arquivo terá `password: ENC(...)` automaticamente.

### 3b. Migrar contexto entre ambientes (adapters, credentials, providers)

Ao copiar `context/` de um ambiente para outro (ex: local → staging), arquivos YAML com campos `ENC(...)` **não funcionam** porque foram encriptados com a `ENCRYPTION_KEY` do ambiente de origem. O backbone destino tem outra chave e falha silenciosamente na descriptografia.

**Procedimento obrigatório: descriptografar → copiar plaintext → auto-encriptar.**

```bash
# 1. No ambiente de ORIGEM, descriptografar todos os YAMLs com ENC()
#    (adapters, credentials, providers, settings.yml)
node --env-file=.env -e "
const{scryptSync,createDecipheriv}=require('crypto');
const{readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync}=require('fs');
const{join,dirname}=require('path');
const y=require('js-yaml');
const k=scryptSync(process.env.ENCRYPTION_KEY,Buffer.from('agentic-backbone-encryption-salt','utf-8'),32);

function dec(v){
  const p=Buffer.from(v.slice(4,-1),'base64');
  const d=createDecipheriv('aes-256-gcm',k,p.subarray(0,12),{authTagLength:16});
  d.setAuthTag(p.subarray(12,28));
  return Buffer.concat([d.update(p.subarray(28)),d.final()]).toString('utf-8');
}

function walk(o){
  if(!o||typeof o!=='object')return o;
  if(Array.isArray(o))return o.map(walk);
  const r={};
  for(const[k2,v]of Object.entries(o)){
    if(typeof v==='object'&&v!==null){r[k2]=walk(v)}
    else if(typeof v==='string'&&v.startsWith('ENC(')&&v.endsWith(')')){try{r[k2]=dec(v)}catch{r[k2]=v}}
    else{r[k2]=v}
  }
  return r;
}

// Adapters
const adBase='context/shared/adapters';
for(const slug of readdirSync(adBase)){
  const f=join(adBase,slug,'ADAPTER.yml');
  if(!existsSync(f))continue;
  const plain=walk(y.load(readFileSync(f,'utf-8')));
  const out=join('.tmp/context-plain/shared/adapters',slug);
  mkdirSync(out,{recursive:true});
  writeFileSync(join(out,'ADAPTER.yml'),y.dump(plain,{lineWidth:-1}));
  console.log('OK adapter',slug);
}

// Credentials (connectors, providers, api-keys, users)
for(const sub of ['connectors','providers','api-keys','users']){
  const dir=join('context/credentials',sub);
  if(!existsSync(dir))continue;
  for(const entry of readdirSync(dir)){
    const candidates=[join(dir,entry,'default.yml'),join(dir,entry)];
    for(const f of candidates){
      if(!existsSync(f)||!f.endsWith('.yml'))continue;
      const raw=y.load(readFileSync(f,'utf-8'));
      if(!raw||typeof raw!=='object')continue;
      const plain=walk(raw);
      const out=join('.tmp/context-plain/credentials',sub,entry);
      mkdirSync(dirname(f.includes('default.yml')?join(out,'x'):out),{recursive:true});
      writeFileSync(f.includes('default.yml')?join(out,'default.yml'):join('.tmp/context-plain/credentials',sub,entry),y.dump(plain,{lineWidth:-1}));
      console.log('OK credential',sub+'/'+entry);
    }
  }
}

// settings.yml
const sf='context/settings.yml';
if(existsSync(sf)){
  const plain=walk(y.load(readFileSync(sf,'utf-8')));
  mkdirSync('.tmp/context-plain',{recursive:true});
  writeFileSync('.tmp/context-plain/settings.yml',y.dump(plain,{lineWidth:-1}));
  console.log('OK settings.yml');
}
"

# 2. Copiar os plaintext para a VPS
scp -r .tmp/context-plain/shared/adapters/* \
  root@<VPS>:/srv/apps/<dominio>/context/shared/adapters/

scp -r .tmp/context-plain/credentials/* \
  root@<VPS>:/srv/apps/<dominio>/context/credentials/

scp .tmp/context-plain/settings.yml \
  root@<VPS>:/srv/apps/<dominio>/context/settings.yml

# 3. Reiniciar backbone — auto-encripta tudo com a ENCRYPTION_KEY do destino
ssh root@<VPS> "cd /srv/apps/<dominio>/deploy && docker compose restart backbone"

# 4. Limpar plaintext temporários
rm -rf .tmp/context-plain
```

**Atenção:** os `ADAPTER.yml` também contêm campos sensíveis inline (tokens, passwords). Não basta descriptografar só os `credentials/` — os adapters também precisam ser descriptografados e copiados em plaintext.

O backbone auto-encripta ao iniciar e ao detectar mudanças via watcher. Após o restart, todos os campos sensíveis estarão `ENC(...)` com a chave do ambiente destino.

### 4. Docker login (ghcr.io)

```bash
docker login ghcr.io -u gugacoder -p <PAT-com-read:packages>
```

Credenciais ficam em `~/.docker/config.json`. Não precisa refazer.

### 5. Subir stack

```bash
cd /srv/apps/<dominio>/deploy
docker compose pull
docker compose up -d
```

### 6. DNS

Criar registro A apontando `<dominio>` para `31.97.250.133`. Traefik gera TLS automaticamente via Let's Encrypt.

---

## Notas técnicas

### Dockerfiles

- **Backbone**: `tsconfig.build.json` com `noCheck: true` (transpila sem type-checking)
- **Backbone**: node:22-slim não tem wget/curl — healthcheck usa `node -e "fetch(...)"`
- **Hub/Chat**: `npm i @rollup/rollup-linux-x64-gnu` após `npm ci` (fix de rollup cross-platform)
- **Hub/Chat**: `COPY .env* .` + `touch .env` — funciona com e sem `.env` (CI não tem `.env`)
- **Hub/Chat**: output Vite vai para `/usr/share/nginx/html/{hub,chat}/` (subdiretório, não raiz)

### Portas (PREFIX)

```env
PREFIX=60
PUBLIC_PORT=6000    # Caddy via Traefik (na VPS, Caddy escuta na 80)
BACKBONE_PORT=6002  # porta real do Node.js
HUB_PORT=6001       # usado no dev; em Docker hub serve na 80
CHAT_PORT=6003      # usado no dev; em Docker chat serve na 80
```

### Volumes persistentes

| Volume | Path no container | Conteúdo |
|--------|-------------------|----------|
| `../context` | `/app/context` | Agentes, channels, credentials (git-tracked) |
| `./data/backbone` | `/app/apps/backbone/data` | SQLite, sessions, memory DBs |
| `./data/postgres` | `/var/lib/postgresql/data` | Postgres data |
| `./data/redis` | `/data` | Redis AOF |

### Auto-encriptação de YAMLs

Campos sensíveis (matching `key|secret|token|password|pass`) em `.yml` são auto-encriptados pelo backbone no startup e no file change. Valores armazenados como `ENC(base64...)`, decriptados transparentemente por `readYaml()`. Chave derivada de `ENCRYPTION_KEY` via scrypt.

---

## GitHub Actions

CI em `.github/workflows/build.yml`. Matrix strategy builda as 3 imagens em paralelo.

Lógica de tags:
- `refs/heads/develop` → `:staging`
- `refs/heads/main` → `:latest`
- `refs/tags/release-*` → `:release-{n}` + `:latest`

---

## Guardrails

1. **Staging primeiro, sempre.** Nunca deployar direto em prod.
2. **Não derrubar prod** sem autorização explícita.
3. **Avançar por etapas.** Cada etapa validada antes de avançar.

---

## Checklist

- [x] Dockerfiles em `apps/{backbone,hub,chat}/Dockerfile`
- [x] `.dockerignore` na raiz
- [x] `deploy/docker-compose.yml` (pull-only)
- [x] `deploy/Caddyfile`
- [x] `deploy/env/` com templates
- [x] `.github/workflows/build.yml` (CI)
- [x] `image:` no `docker-compose.yml` raiz
- [x] Staging deployado e validado (`h.ab.codr.studio`)
- [ ] Production deployado (`ab.codr.studio`)
- [ ] `OPENROUTER_API_KEY` configurado no staging
