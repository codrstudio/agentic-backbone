# Decisões

## D-01: Eliminar AgentEvent, emitir SDKMessage nativo

AgentEvent foi depreciado na milestone 24. O backbone não mantém código legado — não há clientes em produção.

- `runAgent()` passa a yield `SDKMessage` direto (remove `mapSdkMessage()`)
- Deletar `src/agent/types.ts` (tipo AgentEvent)
- Consumidores adaptam pattern matching: `msg.type === "assistant"` (nested content blocks) em vez de `event.type === "text"` (flat)
- POST /conversations/:id/messages emite SSE no formato: `event: message\ndata: SDKMessage\n\n` + `event: done\ndata: {}\n\n`
- Formato compatível com o parser do hook `useOpenClaudeChat` do openclaude-chat

Consumidores a atualizar (9 arquivos):
- `conversations/index.ts`, `utils/agent-stream.ts`, `channels/delivery/stream-dispatcher.ts`
- `telemetry/instrumentor.ts`, `routes/evaluation.ts`, `benchmarks/index.ts`
- `heartbeat/index.ts` e `cron/executor.ts` (indiretos, via collectAgentResult)

## D-02: Deletar datastream.ts

O protocolo Vercel AI SDK Data Stream foi depreciado na milestone 24. O branch `format === "datastream"` na rota POST /conversations/:id/messages e o arquivo `src/routes/datastream.ts` são removidos.

## D-03: Configuração unificada no openclaude-chat

### Princípio

A configuração de transporte é do **pacote**, não de cada componente. Chat, History, ChatHeader e futuros componentes são consumidores passivos de uma camada de provider que resolve a configuração uma única vez.

### Contrato com o cliente

O cliente configura de **uma** de duas formas:
1. **Rotas padrão**: `endpoint` + `token` — o pacote usa `/conversations/*` out-of-the-box
2. **Handler custom**: `transport` (implementação completa de `ChatTransport`) — o pacote delega tudo para ele

Não há modo misto. O cliente ou implementa todas as rotas ou fornece um handler completo.

### Camada de provider

- A configuração (endpoint+token OU transport) é injetada no provider raiz
- Internamente pode ser um ou mais providers (ChatProvider, HistoryProvider) — modelagem livre
- O que importa: todos compartilham o mesmo transport resolvido
- Nenhum componente aceita `endpoint`/`token`/`transport` próprio que contradiga o provider

### O que muda no openclaude-chat

1. **Corrigir rotas**: `/sessions` e `/sessions/:id/prompt` → `/conversations` e `/conversations/:id/messages`
2. **Wiring do transport**: `useOpenClaudeChat` usa `transport.sendMessage()` quando disponível
3. **Props de componente**: Chat, History, ChatHeader não aceitam config de transporte individual — leem do provider
4. **`createDefaultTransport()`**: implementar `sendMessage()` (POST /conversations/:id/messages → ReadableStream)

### Auditoria completa

Ver `report/CHAT-TRANSPORT-AUDIT.md`.

## D-04: Eliminar rota geral de chat

Chat só existe dentro da página do agente (`/agents/:id/conversations`). Não há mais rota `/conversations` no hub. Simplifica: sem seleção de agente no sidebar, `agentId` é sempre conhecido.

## D-05: Abandonar features backbone-específicas do sidebar

Filtro por agente, filtro por operador, badge "Op" — abandonados por ora. O History do openclaude-chat não tem slots para isso. Podem ser adicionados futuramente se necessário.

## D-06: Usar ChatHeader puro

Sem badge de agente, sem dropdown de export/delete. O ChatHeader do openclaude-chat fornece: título, star, rename, locale. Suficiente.

## D-07: Drawer toggle via HistoryProvider + leftContent slot

O ChatHeader ganha prop `leftContent?: ReactNode` (slot à esquerda, antes do star). O HistoryProvider é estendido com estado de visibilidade do sidebar (`sidebarOpen`, `setSidebarOpen`). O openclaude-chat exporta um `HistoryTrigger` (botão que lê do context e chama toggle).

Uso pelo consumidor:
```tsx
<HistoryProvider ...>
  <History />
  <ChatHeader leftContent={<HistoryTrigger />} ... />
  <Chat ... />
</HistoryProvider>
```

Mobile: o consumidor decide o container (Sheet, Drawer). O openclaude-chat exporta `useIsMobile()` para ajudar.

Análise completa: `report/STUDIES.md#estudo-1`.

## D-08: agentId como config do provider

O agentId vive no HistoryProvider e flui para o transport (`listConversations`, `createConversation`). O transport já aceita agentId — ninguém passava.

Se omitido, o backend decide o agente default (compatível com clientes simples).

ChatHeader ganha `showAgent?: boolean` + `agentAvatar?` + `agentName?`. Quando `showAgent=true`, avatar+nome substituem star+título. Quando false (default), comportamento atual.

5 arquivos no openclaude-chat, todas mudanças non-breaking (props opcionais).

Análise completa: `report/STUDIES.md#estudo-2`.

## D-09: State management — modo controlado agnóstico

O HistoryProvider **já suporta** modo controlado (`activeConversationId` prop + `onActiveChange` callback). Não precisa de adapter para TanStack Router nem qualquer outro state manager.

O hub passa `convId` do TanStack Router como prop controlada e usa callbacks para `navigate()`. O openclaude-chat é agnóstico — funciona com useState, TanStack, Zustand, qualquer coisa.

Nenhuma mudança no openclaude-chat. Mudança no hub: usar `Route.useParams()` tipado em vez de regex.

Análise completa: `report/STUDIES.md#estudo-3`.

## D-10: Realtime + refresh no provider

Os componentes do openclaude-chat precisam reagir a eventos externos (mensagem nova no canal, takeover, etc). Isso não é responsabilidade de um componente — é do **pacote**, via provider.

### Dois mecanismos complementares

**1. Eventos em tempo real**: O provider aceita uma fonte de eventos do consumidor. Quando chega um evento relevante, os componentes reagem (History re-lista, Chat pode exibir notificação, etc).

```typescript
interface ProviderProps {
  // Opção A: callback genérico que o consumer chama quando recebe eventos
  onExternalEvent?: (event: { type: string; data?: unknown }) => void
  // Opção B: o consumer passa um EventSource URL e o provider conecta
  eventsUrl?: string
}
```

A opção A é mais flexível — o consumer (hub) já tem seu SSE próprio e só repassa eventos relevantes.

**2. Refresh geral (fallback)**: Para quando perde sincronia ou o consumer quer forçar atualização.

```typescript
interface ContextValue {
  refresh: () => Promise<void>  // re-lista conversas, etc
}
```

### Uso pelo hub

```tsx
const { refresh } = useOpenClaudeChatContext();

// SSE do hub repassa eventos relevantes
useSSEEvent("channel:message", () => refresh());
useSSEEvent("session:takeover", () => refresh());
```

Evolução futura: componentes podem reagir a tipos de evento específicos (ex: History atualiza título quando recebe `conversation:renamed`). Por ora, `refresh()` geral é suficiente.
