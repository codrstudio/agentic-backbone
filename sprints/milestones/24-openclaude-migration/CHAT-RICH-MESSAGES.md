# Spec: Renderizacao Rica de SDKMessage no Chat

O openclaude-chat hoje consome apenas 3 tipos de SDKMessage (assistant, user, result) e descarta o resto. Esta spec define como o chat deve consumir TODOS os tipos relevantes.

Spec destinada ao workspace do openclaude-chat para implementacao.

---

## Tipos que o chat DEVE renderizar

### Tier 1 — Core (ja existe parcialmente, precisa enriquecer)

#### SDKAssistantMessage (`type: "assistant"`)
- **Hoje:** Extrai text e tool_use blocks.
- **Falta:** Renderizar `error` field (auth error, rate limit, billing, etc.), mostrar `usage` e `stop_reason` em footer discreto, mostrar `model` usado.
- **Error rendering:** Badge colorido por tipo — "Rate limited" (amarelo), "Auth error" (vermelho), "Response truncated" (cinza).

#### SDKUserMessage (`type: "user"`)
- **Hoje:** Extrai texto minimo de tool results.
- **Falta:** Renderizar tool results completos com syntax highlight JSON. Marcar `is_error: true` com fundo vermelho. Linkar ao ToolUseBlock original via `tool_use_id`. Esconder mensagens com `isSynthetic: true`.

#### SDKResultMessage (`type: "result"`)
- **Hoje:** Ignorado.
- **Deve:** Renderizar como footer discreto do turno:
  - Custo: `$0.003`
  - Tokens: `1.2k in / 800 out (450 cached)`
  - Duracao: `2.1s (API: 1.8s)`
  - Turns: `3 turns`
  - Se error: mostrar `errors[]` em alerta vermelho
  - Se `permission_denials[]`: listar tools negados

### Tier 2 — Streaming (critico pra UX suave)

#### SDKPartialAssistantMessage (`type: "stream_event"`)
- **Hoje:** Ignorado completamente.
- **Deve:** Processar o campo `event` (Anthropic SDK RawMessageStreamEvent):
  - `content_block_delta` com `text_delta` → append texto character-by-character (streaming suave)
  - `content_block_delta` com `input_json_delta` → preview live dos args da tool enquanto gera
  - `content_block_start` → placeholder/skeleton pro bloco que vai chegar
  - `content_block_stop` → finalizar bloco, parar spinner
  - `message_start` → sinal de inicio de resposta
  - `message_stop` → sinal de fim
- **Impacto:** Sem isso, o texto so aparece quando a mensagem inteira chega. Com isso, streaming suave como no Claude.ai.

### Tier 3 — Progresso de Tools e Tasks

#### SDKToolProgressMessage (`type: "tool_progress"`)
- **Hoje:** Ignorado.
- **Deve:** Atualizar o ToolInvocationPart correspondente (por `tool_use_id`) com:
  - Tempo decorrido: "Running for 5s..."
  - Spinner com contador
  - Nome da tool sendo executada

#### SDKTaskStartedMessage (`type: "system"`, `subtype: "task_started"`)
- **Hoje:** Ignorado.
- **Deve:** Card de task com: description, status "In Progress", timer.

#### SDKTaskProgressMessage (`type: "system"`, `subtype: "task_progress"`)
- **Hoje:** Ignorado.
- **Deve:** Atualizar card da task com: `tool_uses` invocadas, `total_tokens`, `last_tool_name`.

#### SDKTaskNotificationMessage (`type: "system"`, `subtype: "task_notification"`)
- **Hoje:** Ignorado.
- **Deve:** Finalizar card da task: badge "Completed" (verde) / "Failed" (vermelho) / "Stopped" (cinza). Mostrar `summary`. Link pra `output_file`.

### Tier 4 — Informacional

#### SDKStatusMessage (`type: "system"`, `subtype: "status"`)
- Toast inline: "Compacting conversation history..." quando `status: "compacting"`.

#### SDKCompactBoundaryMessage (`type: "system"`, `subtype: "compact_boundary"`)
- Divider visual no historico: "Conversa compactada (saved {pre_tokens} tokens)".

#### SDKRateLimitEvent (`type: "rate_limit_event"`)
- `status: "allowed_warning"` → badge amarelo: "Rate limit {utilization}% usado"
- `status: "rejected"` → alerta vermelho com countdown pra reset

#### SDKPromptSuggestionMessage (`type: "prompt_suggestion"`)
- Chip/button abaixo do input: "{suggestion}". Click preenche o input.

#### SDKToolUseSummaryMessage (`type: "tool_use_summary"`)
- Box colapsavel acima da sequencia de tools: "Resumo: {summary}".

#### SDKLocalCommandOutputMessage (`type: "system"`, `subtype: "local_command_output"`)
- Code block colapsavel com titulo "Command Output".

### Tier 5 — Hooks (mostrar se relevante)

#### SDKHookStartedMessage / SDKHookProgressMessage / SDKHookResponseMessage
- Status inline discreto: "Running hook: {hook_name}..."
- Resultado final: checkmark verde (success), X vermelho (error), cinza (cancelled).
- Output em painel colapsavel com stdout/stderr.

---

## Tipos que o chat IGNORA

| Tipo | Motivo |
|---|---|
| `SDKPresenceMessage` | Heartbeat puro, sem valor informacional |
| `SDKAuthStatusMessage` | Fluxo de auth — tratar internamente, nao renderizar como mensagem |
| `SDKFilesPersistedEvent` | Notificacao interna de persistencia |
| `SDKUserMessageReplay` | Mensagens replay de sessao resumida — renderizar como UserMessage normal com flag visual "replayed" |
| `SDKSystemMessage` (init) | Metadata de inicializacao — usar internamente pra popular tool registry, nao renderizar |

---

## Persistencia (o que o backbone armazena)

O backbone intercepta o stream de `query()` e persiste no JSONL:

**Persistir:**
- `SDKAssistantMessage` — resposta do agente
- `SDKUserMessage` — mensagem do usuario + tool results
- `SDKResultMessage` — metadata do turno (custo, usage, errors)

**Nao persistir (efemero):**
- Tudo de streaming (SDKPartialAssistantMessage)
- Tudo de progresso (tool progress, task progress)
- Tudo de status (compacting, rate limit, presence)
- Hooks, suggestions, summaries

O historico armazenado e o "transcript" da conversa. O enriquecimento (streaming, progresso, etc.) acontece em tempo real durante o streaming e nao precisa ser recuperado depois.

---

## Prioridade de implementacao

1. **SDKPartialAssistantMessage** — streaming suave. Maior impacto na UX.
2. **SDKToolProgressMessage** — progresso de tools. Segundo maior impacto.
3. **SDKResultMessage** — metricas do turno. Transparencia pro usuario.
4. **SDKTaskStarted/Progress/Notification** — dashboard de tasks.
5. **SDKRateLimitEvent + SDKPromptSuggestionMessage** — polish.
6. **Hooks + outros** — nice-to-have.
