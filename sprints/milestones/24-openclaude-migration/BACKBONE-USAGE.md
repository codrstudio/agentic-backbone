# Uso da @agentic-backbone/ai-sdk no Backbone

Mapeamento exaustivo de todos os pontos de contato entre o backbone e a ai-sdk.

---

## Imports Diretos (3 arquivos)

### 1. `apps/backbone/src/agent/index.ts`

```typescript
import { runAgent as runProxyAgent, type AgentEvent, type UsageData } from "@agentic-backbone/ai-sdk";
```

**O que faz:** Wrapa `runProxyAgent()` numa funcao `runAgent()` local que:
- Resolve modelo via routing rules
- Compoe parametros: model, apiKey, provider, providers, prompt, sessionId, sessionDir, messageMeta, role, tools, maxTurns (100), system, contentParts, disableDisplayTools, cwd, providerConfig
- Retorna `AsyncGenerator<AgentEvent>`

**Parametros passados para a SDK:**
```typescript
{
  model,                    // Resolvido via routing rules
  apiKey,                   // Do env ou provider config
  provider,                 // openrouter, claude-direct, gemini-direct, etc.
  providers,                // Extra provider configs (baseURL, apiKey) para non-openrouter
  prompt,                   // Input do usuario
  sessionId,                // Identificador de sessao
  sessionDir,               // Diretorio para persistencia
  messageMeta,              // Metadata de mensagem
  role,                     // conversation | cron | heartbeat | memory | request | webhook
  tools,                    // Record<string, Tool> — tools compostos
  maxTurns: 100,
  system,                   // System prompt customizado
  contentParts,             // Attachments (content parts)
  disableDisplayTools,      // Flag booleana
  cwd,                      // Working directory
  providerConfig: {
    temperature,
    top_p,
    frequency_penalty,
    max_tokens,
    webSearch,              // Provider slug (brave)
    braveApiKey,
  }
}
```

### 2. `apps/backbone/src/agent/types.ts`

```typescript
export type { AgentEvent, UsageData } from "@agentic-backbone/ai-sdk";
```

Re-exporta tipos para consumo interno.

### 3. `apps/backbone/src/memory/flush.ts`

```typescript
import { aiGenerateObject } from "@agentic-backbone/ai-sdk";
```

**Uso:**
```typescript
extracted = await aiGenerateObject({
  model: modelId,
  apiKey,
  provider,
  baseURL: providerConf.baseURL,
  schema: MemoryExtractionSchema,  // Zod schema
  system,
  prompt,
});
```

Extrai fatos de memoria de historico de conversas. Inclui fallback para JSON malformado do Gemini.

---

## Consumidores Indiretos (via `runAgent` local)

### `conversations/index.ts`
- Chama `runAgent()` para supervisor orchestration e conversas
- Consome eventos: `text`, `result`, `usage`
- Persiste sessao via SDK (saveSession delegado)

### `telemetry/instrumentor.ts`
- Wrapa `runAgent()` com OpenTelemetry spans
- Captura: model, input_tokens, output_tokens, routing resolution

### `utils/agent-stream.ts`
- Consome async generator e agrega: coleta `text`, `result`, `usage`
- Retorna `AgentResult` com texto completo e usage

### `cron/executor.ts`
- Usa `instrumentedRunAgent()` (wrapper com telemetria)
- Passa routing context, tools compostos, timeout 10min
- Extrai usage para cost tracking

### `routes/agents.ts`
- `/agents/:id/request` — invocacao direta em modo request (SSE ou JSON)
- `/agents/:id/services/:slug` — invocacao de servico via agente

### `routes/channels.ts`
- Processa mensagens de canal, coleta resultados

### `routes/webhooks.ts`
- Fire-and-forget webhook processing

### `routes/drafts.ts`
- Comparacao multi-agente (production vs draft system prompts)

### `routes/evaluation.ts`
- Pipeline de avaliacao — roda agente em test cases e julga respostas

### `routes/datastream.ts`
- Traduz `AgentEvent` → formato Vercel AI SDK DataStream

### `benchmarks/index.ts`
- Pipeline de benchmark com deteccao de regressao

### `channels/delivery/stream-dispatcher.ts`
- Wrapa event stream para despachar resultados intermediarios para canais

### `events/index.ts`
- Usa `UsageData` no tipo `HeartbeatStatusEvent`

### `heartbeat/log.ts`
- Extrai campos de usage: inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, totalCostUsd, numTurns, stopReason

---

## Eventos Consumidos (`AgentEvent`)

| Evento | Onde consumido | O que extraem |
|--------|---------------|---------------|
| `init` | conversations | Inicializacao |
| `text` | conversations, agent-stream, stream-dispatcher | Delta de texto |
| `tool-call` | datastream, stream-dispatcher | toolCallId, toolName, args |
| `tool-result` | datastream, stream-dispatcher | toolCallId, result |
| `reasoning` | datastream | Conteudo de raciocinio |
| `step_finish` | datastream | Fim de step |
| `usage` | conversations, cron, agent-stream, heartbeat-log | Tokens, custo, duracao |
| `result` | conversations, agent-stream | Texto final acumulado |

---

## Composicao de Tools

**Arquivo:** `apps/backbone/src/agent/tools.ts`

Tools passados para a SDK como `Record<string, Tool>`:

| Grupo | Tools | Origem |
|-------|-------|--------|
| Job tools | submit_job, list_jobs, get_job, kill_job | `createJobTools(callbacks)` |
| Memory AI tools | memory_search, memory_store | `createMemoryAiTools()` |
| Cron tools | cron_list, cron_create, cron_delete | `createCronTools()` |
| Connector tools | Variam por connector (mysql, postgres, evolution, twilio) | MCP + custom |
| Channel tools | send_message, list_channels | `createMessageTools()` |
| System tools | emit_event, get_sysinfo | Custom |
| Approval wrappers | Decoram tools com aprovacao | Custom middleware |
| Timeout wrappers | Decoram tools com timeout/quota | Custom middleware |

**Formato de cada tool:**
```typescript
{
  description: string,
  parameters: ZodSchema,
  execute: (args: unknown) => Promise<unknown>
}
```

---

## Campos de `UsageData` Usados

```typescript
{
  inputTokens: number,
  outputTokens: number,
  cacheReadInputTokens: number,
  cacheCreationInputTokens: number,
  totalCostUsd: number,
  numTurns: number,
  durationMs: number,
  durationApiMs: number,
  stopReason: string,
}
```

Todos os campos sao usados em pelo menos um ponto:
- `totalCostUsd` → billing, quota
- `inputTokens` + `outputTokens` → telemetria, logs
- `numTurns` → monitoring
- `stopReason` → diagnostico
- `durationMs` → performance tracking

---

## Routing / Provider Config

O backbone tem um sistema de routing que seleciona modelo/provider por agente:

```typescript
interface RoutingContext {
  estimatedTokens: number,
  toolCount: number,
  mode: string,
}

interface RoutingRule {
  // criteria → model + provider selection
}
```

O resultado do routing e passado para a SDK via `model`, `apiKey`, `provider`, `providers`.
