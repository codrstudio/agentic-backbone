# proto-7 — Chat rico via SDK-3 (registry de providers)

## Hipotese

Substituir a configuracao manual de modelos (funcao `openrouter()` + array `MODELS[]`) pelo sistema de registry da sdk-3 (`createOpenRouterRegistry`) simplifica a gestao de providers e modelos, centralizando a logica de resolucao de env vars no SDK.

## Arquitetura

```
Browser (React) <-SSE-> Server (Hono) <-sdk-3 query()-> openclaude CLI (subprocess)
```

### Diferenca do proto-6

proto-6 usa sdk-2 com configuracao manual: cada modelo precisa de uma `ModelConfig` com `env` gerado pela funcao `openrouter()`.
proto-7 usa sdk-3 com `createOpenRouterRegistry()`, que encapsula a logica de provider. O server apenas declara os modelos e passa `registry` + `model` para `query()`.

### Fluxo de dados

1. User digita mensagem no frontend
2. Frontend faz `POST /api/sessions/:id/message` com `{ content, modelId }`
3. Server chama `query({ prompt, model, registry, options })` da sdk-3
4. sdk-3 resolve o env do modelo via registry, spawna o CLI, parseia JSONL, e yield cada `SDKMessage`
5. Server reenvia cada message como SSE
6. Frontend parseia cada evento SSE e renderiza (identico ao proto-6)

### Simplificacao

- **Removido**: `openrouter()`, `OPENROUTER_KEY`, `ModelConfig`, array `MODELS[]`
- **Adicionado**: `createOpenRouterRegistry()` com lista declarativa de modelos
- **Resultado**: configuracao de modelos mais limpa e extensivel

## Como rodar

```bash
cd prototypes/proto-7
npm install
npm run server   # porta 3216
npm run dev      # porta 5186 (proxy para server)
```

## Resultado

**Em teste**
