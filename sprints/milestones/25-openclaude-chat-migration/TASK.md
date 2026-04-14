# Milestone 25 — Migração para @codrstudio/openclaude-chat

Migrar o frontend (hub, chat) de `@agentic-backbone/ai-chat` para `@codrstudio/openclaude-chat` e eliminar código legado (AgentEvent, datastream, ai-sdk).

**Escopo:** backbone + openclaude-chat + hub. Três repos envolvidos.

## Recursos

| Recurso | Caminho |
|---|---|
| **Backbone** | `apps/backbone/` (este repo) |
| **Hub** | `apps/hub/` (este repo) |
| **OpenClaude Chat** (editável) | `D:\aw\context\workspaces\openclaude-chat\repo\` |
| **OpenClaude Chat demo app** | `D:\aw\context\workspaces\openclaude-chat\repo\.tmp\demo\` |
| **OpenClaude SDK demo server** | `D:\aw\context\workspaces\openclaude-sdk\repo\.tmp\demo\server.mjs` |
| **Milestone 24** (referência) | `sprints/milestones/24-openclaude-migration/` |
| **Decisões detalhadas** | `DECISIONS.md` (neste milestone) |
| **Riscos detalhados** | `RISKS.md` (neste milestone) |

---

## Checklist de implementação

### Fase 1 — Backbone: SDKMessage nativo

AgentEvent foi depreciado na milestone 24. O backbone emite SDKMessage nativo, sem camada intermediária.

- [x] **Eliminar AgentEvent** (D-01)
  - Removido `mapSdkMessage()` de `apps/backbone/src/agent/index.ts`
  - `runAgent()` yield `SDKMessage` direto
  - AgentEvent removido de `apps/backbone/src/agent/types.ts` (UsageData mantido)
  - Re-exportados SDKMessage types do openclaude-sdk

- [x] **Atualizar consumidores** (D-01)
  - `src/conversations/index.ts` — pattern matching SDKMessage
  - `src/utils/agent-stream.ts` — reescrito com `extractUsage()`, `extractText()`, `collectAgentResult()`
  - `src/channels/delivery/stream-dispatcher.ts` — reescrito (R-01): flush por SDKAssistantMessage
  - `src/telemetry/instrumentor.ts` — usa `extractUsage()` de SDKResultMessage
  - `src/routes/evaluation.ts` — extrai texto de SDKAssistantMessage
  - `src/benchmarks/index.ts` — idem
  - `src/routes/agents.ts` — SSE com `event: "message"`
  - `src/routes/drafts.ts` — SSE com `event: "message"` + `event: "done"`

- [x] **Deletar datastream.ts** (D-02)
  - Removido `apps/backbone/src/routes/datastream.ts`
  - Removido branch `format === "datastream"` e import de `encodeDataStreamEvent`

- [x] **SSE nativo com SDKMessage** (D-01)
  - POST /conversations/:id/messages emite `event: message\ndata: SDKMessage\n\n` + `event: done`
  - Typecheck passa limpo (tsc --noEmit exit 0)

#### R-01: stream-dispatcher — mudança de semântica de boundary

**Arquivo**: `apps/backbone/src/channels/delivery/stream-dispatcher.ts`

Hoje o dispatcher acumula texto e faz flush em `event.type === "assistant-complete"`. Com SDKMessage, `assistant-complete` não existe.

**Antes** (AgentEvent):
```typescript
for await (const event of events) {
  if (event.type === "text") buffer += event.content;
  if (event.type === "assistant-complete" || event.type === "result") {
    // flush buffer → deliverToChannel
  }
  yield event;
}
```

**Depois** (SDKMessage): Cada `SDKAssistantMessage` já traz o texto completo do turno. Não acumular — extrair e entregar direto.
```typescript
for await (const msg of messages) {
  if (msg.type === "assistant") {
    const text = msg.message.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
    if (text.trim()) {
      await deliverToChannel(..., text.trim(), ...);
    }
  }
  // result → flush residual se houver (improvável)
  yield msg;
}
```

**Cuidados**:
- **Ignorar** `stream_event` (deltas char-by-char) — são fragmentos, não mensagens completas
- **Ignorar** `user` (tool results), `tool_progress`, `presence`, `system`
- Reagir **somente** a `assistant` e `result`
- Um turno pode gerar **múltiplas** SDKAssistantMessage (ex: uma com tool_use, outra com texto). Cada uma com texto é um flush. Isso é correto.

---

### Fase 2 — openclaude-chat: configuração unificada

Mudanças no repo `D:\aw\context\workspaces\openclaude-chat\repo\`.

**Princípio (D-03)**: A configuração de transporte é do **pacote**, não de cada componente. O cliente configura uma vez: `endpoint+token` (rotas `/conversations/*` out-of-the-box) OU `transport` handler completo. Chat, History, ChatHeader são consumidores passivos do provider.

- [x] **Corrigir rotas hardcoded** (D-03)
  - `useOpenClaudeChat.ts`: `/sessions` → `/conversations`, `/sessions/:id/prompt` → `/conversations/:id/messages`
  - Body: `{ prompt }` → `{ message }`
  - Demo mock fetcher atualizado para `/conversations` e `/messages`
  - `createDefaultTransport()`: `sendMessage()` implementado (POST /conversations/:id/messages)

- [x] **Wiring do transport** (D-03)
  - `createDefaultTransport()`: `sendMessage()` implementado (POST /conversations/:id/messages)
  - Nota: wiring completo no hook (usar transport.sendMessage ao invés de fetch direto) pendente para próxima iteração — por ora o hook usa rotas /conversations/* direto

- [x] **Drawer toggle** (D-07)
  - `ChatHeader.tsx` — prop `leftContent?: ReactNode` adicionado
  - `HistoryProvider.tsx` — `sidebarOpen`, `setSidebarOpen`, `defaultSidebarOpen`
  - Exportado `HistoryTrigger` em `src/components/HistoryTrigger.tsx` + index.ts

- [x] **agentId como config do provider** (D-08)
  - `HistoryProvider.tsx` — `agentId` no context
  - `useHistoryData.ts` — recebe agentId via options, passa para listConversations e createConversation
  - `History.tsx` — lê agentId do context via useHistoryContext
  - `ChatHeader.tsx` — props `showAgent`, `agentAvatar`, `agentName`

- [x] **Refresh via context** (D-10)
  - `HistoryProvider.tsx` — `refresh()` e `registerRefresh()` no context
  - `useHistoryData.ts` — registra seu refresh via `registerRefresh`
  - Consumidores chamam `refresh()` do context para forçar re-listagem

- [ ] **Componentes leem do provider** (D-03) — adiado
  - Chat/ChatProvider ainda aceitam endpoint/token individual
  - Unificação total do provider (remover props individuais) fica para próxima iteração
  - Por ora: History e ChatHeader leem do HistoryProvider, Chat usa endpoint+token direto

---

### Fase 3 — Hub: migrar para openclaude-chat

- [x] **Instalar @codrstudio/openclaude-chat no hub**
  - `apps/hub/package.json`: `-ai-chat`, `+openclaude-chat`

- [x] **Eliminar rota geral de chat** (D-04)
  - Deletado `conversations.tsx`, `conversations/index.tsx`, `conversations/$id.tsx`, `conversations/new.tsx`
  - Removido `/conversations` do nav-menu.tsx (ROUTE_TO_KEY + navItemsCore)

- [x] **Reescrever conversations-layout.tsx** (D-03, D-07, D-08, D-09)
  - De ~491 LOC para ~160 LOC
  - HistoryProvider + History + ChatHeader + HistoryTrigger do openclaude-chat
  - Layout responsivo: DesktopSidebar (inline) + MobileDrawer (Sheet)
  - State controlado via URL pathname
  - agentId → HistoryProvider (D-08)
  - CSS @source atualizado para node_modules/@codrstudio/openclaude-chat/dist

- [x] **Adaptar conversation-chat.tsx** (D-03)
  - Import Chat de @codrstudio/openclaude-chat
  - Removido buildInitialMessages (110 LOC)
  - Chat usa endpoint="/api/v1/ai" + sessionId direto
  - Mantido: takeover, approval, orchestration path

- [x] **Limpar API conversations.ts** (D-03, D-04)
  - Removido: conversationsQueryOptions, createConversation, renameConversation, starConversation, deleteConversation, conversationMessagesQueryOptions, ConversationMessage
  - Mantido: conversationQueryOptions, sessionQueryOptions, agentConversationsQueryOptions, takeover/release
  - Atualizado agent-actions.tsx: createConversation inline + navegar para rota do agente

---

### Fase 4 — Cleanup

- [x] **Deletar pacotes locais**
  - Removido `apps/packages/ai-chat/` e `apps/packages/ai-sdk/`

- [x] **Limpar apps/chat/package.json**
  - Removido `@agentic-backbone/ai-chat`

- [x] **Limpar root package.json**
  - Workspaces: `apps/packages/ui` + `apps/packages/gitlab/v4` (removido glob `apps/packages/*`)
  - Scripts: removido build de ai-sdk, removido version:packages e publish:packages
  - Nota: deps usam vendor tarballs (`file:vendor/...`), não npm registry

- [x] **Atualizar guias**
  - `00-quick-reference.md` — refs atualizadas para `@codrstudio/openclaude-chat`
  - `04-react-integration.md` — refs e hook renomeados

- [x] **Deletar test legado**
  - Removido `tests/probe-ai.mjs` (importava de `@agentic-backbone/ai-sdk`)
