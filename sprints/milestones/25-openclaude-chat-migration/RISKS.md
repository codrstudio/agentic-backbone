# Riscos e Surpresas

Análise de riscos por fase do TASK.md.

---

## Fase 1 — Backbone: SDKMessage nativo

### R-01: `assistant-complete` boundary no stream-dispatcher ⚠️ ALTO

**Arquivo**: `apps/backbone/src/channels/delivery/stream-dispatcher.ts`

#### O que faz hoje

O stream-dispatcher acumula texto em buffer e faz flush para canais (WhatsApp, etc) em dois momentos:
1. `event.type === "assistant-complete"` — mensagem intermediária (agente terminou um turno mas vai continuar)
2. `event.type === "result"` — mensagem final

Código atual (L25-31):
```typescript
for await (const event of events) {
  if (event.type === "text" && event.content) {
    buffer += event.content;
  }
  if (event.type === "assistant-complete" || event.type === "result") {
    // flush buffer → deliverToChannel
  }
  yield event;
}
```

#### O que muda com SDKMessage

`assistant-complete` **não existe** em SDKMessage. Era um evento sintético criado por `mapSdkMessage()` (que será removido).

Em SDKMessage, a semântica é diferente:
- **`SDKAssistantMessage`** (`msg.type === "assistant"`) — contém `message.content[]` com todos os blocks de um turno. Cada SDKAssistantMessage **é** a mensagem completa daquele turno. Não há evento separado de boundary.
- **`SDKResultMessage`** (`msg.type === "result"`) — fim da execução. Contém usage/cost.

#### Como adaptar

O dispatcher não acumula texto char-by-char e depois faz flush. Cada `SDKAssistantMessage` já traz o texto completo do turno. A lógica muda de "acumular e flush em boundary" para "extrair texto e entregar em cada assistant message":

```typescript
for await (const msg of messages) {
  if (msg.type === "assistant") {
    // Extrair texto dos content blocks
    const text = msg.message.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
    
    if (text.trim()) {
      // Flush imediato — a mensagem já está completa
      await deliverToChannel(..., text.trim(), ...);
    }
  }

  if (msg.type === "result") {
    // Último flush se houver texto residual (improvável mas seguro)
    // + sinaliza fim
  }

  yield msg;
}
```

#### Cuidado

- **Não confundir** `SDKAssistantMessage` com `stream_event`. Os `stream_event` são deltas character-by-character (content_block_start, content_block_delta, content_block_stop). Estes **não** devem triggerar flush — são fragmentos, não mensagens completas.
- O dispatcher deve ignorar `stream_event`, `user` (tool results), `tool_progress`, `presence`, `system`. Só reagir a `assistant` e `result`.
- Um turno do agente pode gerar **múltiplas** SDKAssistantMessage (ex: uma com tool_use, outra com texto). Cada uma é um boundary natural — entregar cada uma que tiver texto é o comportamento correto.

#### Risco se não adaptar

Canais (WhatsApp, etc) param de receber mensagens intermediárias. O agente responde mas o canal só recebe silêncio até o timeout ou até o result final.

---

### R-02: Mensagens `presence` vazando para clientes ⚠️ MÉDIO

**Arquivos**: `src/routes/conversations.ts:391`, `src/routes/agents.ts:256`

Hoje `mapSdkMessage()` filtra `presence`, `stream_event`, `tool_progress`, etc. Se removermos o filtro e emitirmos SDKMessage raw, **todos** os tipos vão para o SSE, incluindo `presence` (heartbeat do SDK).

**Risco**: Clientes recebem mensagens que não esperam. Mas note: o hook `useOpenClaudeChat` **já trata** presence — ignora tipos que não conhece e trata `ping`/`keepalive`/`heartbeat` como no-op.

**Resolução**: Não filtrar. Emitir tudo como `event: message`. O hook já é resiliente a tipos desconhecidos. O único ajuste: o backbone pode opcionalmente emitir `presence` como `event: ping` (o hook trata ambos).

---

### R-03: Evento `init` (sessionId) — uso real limitado ✅ BAIXO

**Achado**: `conversations/index.ts` **não consome** o evento `init`. O sessionId é resolvido ANTES do runAgent via `initPersistentSession()`.

Únicos consumidores são `ai-sdk/proxy.ts` (será deletado) e `datastream.ts` (será deletado).

**Resolução**: Nenhuma ação necessária. O SDKSystemMessage com `subtype: "init"` continuará fluindo no stream mas ninguém precisa dele.

---

### R-04: UsageData type ✅ BAIXO

`UsageData` é importado de `agent/types.ts` por 5 arquivos. Pode ser mantido como tipo independente (não depende de AgentEvent) ou substituído por extração inline de `SDKResultMessage`.

**Resolução**: Manter `UsageData` como tipo utilitário em `agent/types.ts` ou mover para `utils/`. Não quebra nada.

---

### R-05: Hono SSE `event` field ✅ CONFIRMADO

O backbone já usa `stream.writeSSE({ event: "connected", data: ... })` em `src/events/sse.ts:10`. Hono suporta o campo `event`.

---

### R-06: Nenhum consumidor externo de AgentEvent ✅ CONFIRMADO

`apps/hub`, `apps/chat`, `apps/web` não importam AgentEvent do backbone. O `ai-sdk/proxy.ts` define seu próprio tipo (será deletado junto com ai-sdk).

---

## Fase 2 — openclaude-chat: configuração unificada

### R-07: Demo app quebra ⚠️ MÉDIO

**Arquivo**: `.tmp/demo/src/App.tsx:16,22`

O demo tem mock fetcher que intercepta `/sessions` e `/sessions/:id/prompt`. Se mudar para `/conversations`, o mock quebra.

**Resolução**: Atualizar o mock fetcher no demo. Baixo esforço.

---

### R-08: `ensureSession` vs `createConversation` — shape mismatch ⚠️ MÉDIO

O hook envia `{ options, model }` para POST /sessions. O transport.createConversation espera `{ agentId?, options? }`.

**Risco**: Se o hook passar a usar transport.createConversation, o campo `model` não é propagado. E o `agentId` não é enviado.

**Resolução**: Alinhar a interface. O createConversation pode aceitar `{ agentId?, options?, model? }`, ou model vai dentro de options.

---

### R-09: `sendMessage` return type — AsyncGenerator vs ReadableStream ⚠️ MÉDIO

`ChatTransport.sendMessage()` declara retorno `AsyncGenerator<unknown> | ReadableStream<unknown>`. O hook lê de `res.body.getReader()` (ReadableStream).

**Risco**: Se o transport retornar AsyncGenerator, o hook não consegue consumir.

**Resolução**: O default transport retorna `ReadableStream` (body do fetch). Custom transports devem retornar ReadableStream também. Simplificar a interface para só `ReadableStream`.

---

### R-10: Version do pacote npm ✅ BAIXO

O source local está em 0.4.0 (não 0.2.0 como no npm). Nenhum consumidor pina versão.

---

### R-11: History fallback para localStorage ⚠️ BAIXO

Se History não receber transport nem endpoint, cai em localStorage silenciosamente. Com provider unificado, isso não deveria acontecer — mas se alguém renderizar fora do provider, falha silenciosa.

**Resolução**: Após unificação do provider, History pode lançar erro se não encontrar transport no context (fail fast).

---

## Fase 3 — Hub: migrar para openclaude-chat

### R-12: Nav menu ainda aponta para /conversations ⚠️ ALTO

**Arquivo**: `apps/hub/src/components/layout/nav-menu.tsx:42,65`

```tsx
"/conversations": "conversas"
{ label: "Conversas", icon: MessageSquare, to: "/conversations" }
```

**Risco**: Link morto no menu após deletar a rota.

**Resolução**: Remover do nav-menu.tsx.

---

### R-13: CSS — @source aponta para ai-chat local ⚠️ ALTO

**Arquivo**: `apps/hub/src/index.css:4`

```css
@source "../../packages/ai-chat/src/**/*.tsx";
```

O hub escaneia classes Tailwind do ai-chat source. Se deletar ai-chat e usar openclaude-chat do npm (node_modules), as classes não são escaneadas.

**Risco**: Componentes do openclaude-chat perdem estilos.

**Resolução**: O openclaude-chat exporta `styles.css` compilado (confirmado no package.json exports). Trocar @source por `@import "@codrstudio/openclaude-chat/styles.css"`. Ou apontar @source para `node_modules/@codrstudio/openclaude-chat/dist/**/*.js`.

---

### R-14: Auth — `credentials: "include"` ⚠️ ALTO

**Arquivo**: `apps/hub/src/components/conversations/conversation-chat.tsx:163`

O hub usa HttpOnly cookie (token vazio). O ai-chat antigo faz `credentials: "include"` no fetch.

**Risco**: Se o openclaude-chat não incluir `credentials: "include"`, os requests do Chat e History chegam sem cookie → 401.

**Achado**: O hook `useOpenClaudeChat` (L80) usa `const doFetch = fetcher ?? fetch`. O `fetch` padrão do browser **não** inclui credentials em requests cross-origin por default, mas em same-origin (que é o caso do hub via proxy) inclui cookies automaticamente.

**Resolução**: Verificar se o proxy do vite faz same-origin. Se sim, cookies vão automaticamente. Se não (CORS), passar `fetcher` customizado com `credentials: "include"`. O transport default também usa `fetch` sem credentials — mesmo caso.

---

### R-15: initialMessages — tipo Message diferente ⚠️ MÉDIO

O ai-chat usa `Message` de `@ai-sdk/react`. O openclaude-chat define seu próprio `Message` type (com `parts: MessagePart[]`, `turnMeta?`, etc).

**Risco**: `buildInitialMessages` (110 LOC em conversation-chat.tsx) gera mensagens no formato `@ai-sdk/react` que não são compatíveis com openclaude-chat.

**Resolução**: O openclaude-chat exporta `convertSDKMessages()` que converte SDKMessage raw → Message[]. O backbone já retorna SDKMessage raw no GET /messages (format CLI JSONL). Substituir `buildInitialMessages` por `convertSDKMessages()`. Se o backend retornar no formato correto, eliminar toda a conversão no hub.

---

### R-16: SSE invalidation vs History interno ⚠️ MÉDIO

O hub tem SSE que invalida `queryKey: ["conversations"]` em eventos `channel:message` e `session:takeover`. Se History gerencia seu próprio estado (não usa react-query), a invalidação não chega.

**Risco**: Conversa nova chega por canal → History não atualiza sidebar.

**Resolução**: Duas opções: (a) History do openclaude-chat tem mecanismo de refresh externo (callback ou método), (b) adicionar listener SSE que chama refresh no History. Investigar se History expõe refresh.

---

### R-17: Takeover ✅ BAIXO

Takeover é gerenciado por componentes externos (TakeoverButton, TakeoverBanner) e queries separadas (sessionQueryOptions). O Chat do openclaude-chat é stateless em relação a takeover — aceita sessionId e envia mensagens. Não interfere.

---

### R-18: Route `conversations/new.tsx` existe ⚠️ BAIXO

**Arquivo**: `routes/_authenticated/conversations/new.tsx`

Rota para criar conversa com seleção de agente. Precisa ser deletada junto com as outras rotas gerais.

---

## Resumo

| ID | Fase | Risco | Severidade | Resolvido? |
|----|------|-------|-----------|------------|
| R-01 | 1 | assistant-complete boundary | ALTO | Resolução clara |
| R-02 | 1 | presence vazando | MÉDIO | Hook já trata |
| R-03 | 1 | init event | BAIXO | Ninguém usa |
| R-04 | 1 | UsageData type | BAIXO | Manter como utilitário |
| R-05 | 1 | Hono SSE event | BAIXO | Confirmado ok |
| R-06 | 1 | Exports externos | BAIXO | Nenhum |
| R-07 | 2 | Demo quebra | MÉDIO | Atualizar mock |
| R-08 | 2 | Shape mismatch | MÉDIO | Alinhar interface |
| R-09 | 2 | sendMessage type | MÉDIO | Simplificar para ReadableStream |
| R-10 | 2 | npm version | BAIXO | Ok |
| R-11 | 2 | History fallback | BAIXO | Fail fast |
| R-12 | 3 | Nav menu link morto | ALTO | Remover do nav-menu |
| R-13 | 3 | CSS @source | ALTO | Trocar para import styles.css |
| R-14 | 3 | Auth credentials | ALTO | Verificar same-origin |
| R-15 | 3 | Message type | MÉDIO | Usar convertSDKMessages |
| R-16 | 3 | SSE → History refresh | MÉDIO | Investigar refresh API |
| R-17 | 3 | Takeover | BAIXO | Não interfere |
| R-18 | 3 | Rota new.tsx | BAIXO | Deletar junto |
