# Secrets — dotenvx (per-environment)

Arquivos `.env.{environment}.enc` encriptados no repositório via [@dotenvx/dotenvx](https://dotenvx.com/). O `.env` runtime é gitignored (plaintext).

## Arquitetura

```
No git (encriptados):   .env.development.enc  .env.staging.enc  .env.production.enc
Em uso (gitignored):    .env
```

## Arquivos

| Arquivo | Commitado | Descrição |
|---|---|---|
| `.env.development.enc` | sim | Secrets de dev (encriptado) |
| `.env.staging.enc` | sim | Secrets de staging (encriptado) |
| `.env.production.enc` | sim | Secrets de produção (encriptado) |
| `.env` | não | Runtime (plaintext, gitignored) |
| `.env.example` | sim | Template com placeholders (sem secrets) |
| `.env.keys` | não | Chaves privadas (gitignored) |

## Uso

```bash
npm run secrets:decrypt                  # .env.development.enc → .env
npm run secrets:decrypt -- staging       # .env.staging.enc → .env
npm run secrets:decrypt -- production    # .env.production.enc → .env

npm run secrets:encrypt                  # .env → .env.development.enc
npm run secrets:encrypt -- staging       # .env → .env.staging.enc
npm run secrets:encrypt -- production    # .env → .env.production.enc
```

Os scripts `dev:*` usam `dotenvx run -f .env.development.enc` e decriptam em memória — não é necessário decriptar antes.

## Chave privada

Cada ambiente gera seu próprio keypair (sufixado: `DOTENV_PRIVATE_KEY_DEVELOPMENT_ENC`, etc.). Todas ficam em `.env.keys`.

### Resolução (ordem de prioridade)

1. **Env vars `DOTENV_PRIVATE_KEY_*`** — servidor/CI.
2. **`.env.keys` arquivo** — conveniência local (dotenvx lê automaticamente).

### Primeiro setup

Obtenha o `.env.keys` com um colega e coloque na raiz do projeto.

## Deploy

```bash
git pull
npm run secrets:decrypt -- production    # .env.production.enc → .env (plaintext)
docker compose up -d                     # lê .env normalmente
```

Para staging no mesmo servidor:

```bash
cd /srv/apps/staging
npm run secrets:decrypt -- staging
docker compose up -d
```

## Alterar um secret

```bash
npm run secrets:decrypt                  # .env.development.enc → .env
vim .env                                 # edite normalmente
npm run secrets:encrypt                  # .env → .env.development.enc (encriptado)
git add .env.development.enc
git commit -m "chore: update secrets"
```

O encrypt preserva o keypair existente — a chave privada não muda.

## Criar novo ambiente

```bash
vim .env                                 # ajustar valores para o novo ambiente
npm run secrets:encrypt -- staging       # cria .env.staging.enc
git add .env.staging.enc
git commit -m "chore: add staging secrets"
```

## Notas

- dotenvx encripta valores inline — nomes de variáveis ficam visíveis no diff.
- `dotenvx run -f .env.development.enc` decripta em memória, nunca toca o disco.
- `secrets.sh` limpa o header dotenvx do `.env` no decrypt (sem lixo no runtime).
- Ambientes staging/production têm o bloco DEV OVERRIDES comentado.
