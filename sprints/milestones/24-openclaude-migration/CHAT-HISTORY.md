# Spec: Historico de Conversas no Chat

Spec destinada ao workspace do openclaude-chat para implementacao do carregamento e persistencia de historico.

---

## Modelo de dados

### O que o backbone armazena

O backbone intercepta o stream de `query()` e persiste no JSONL (um arquivo por conversa):

- `SDKAssistantMessage` — resposta do agente
- `SDKUserMessage` — mensagem do usuario + tool results
- `SDKResultMessage` — metadata do turno (custo, usage, errors)

Tudo o mais (streaming parcial, progress, presence, hooks) e efemero e nao e persistido.

### Formato de storage

Mensagens sao armazenadas no formato `SDKMessage` — exatamente como trafegam entre SDK e chat. Zero transformacao no GET.

Conversas legacy (formato antigo `{role, content, _meta}`) sao convertidas on-the-fly pelo backbone no GET messages.

### Compactacao nao nos afeta

O Claude Code compacta contexto internamente pra caber na context window. Isso e interno do CLI. O backbone acumula todas as mensagens independentemente. O historico do backbone e sempre completo.

---

## Carregamento de historico

### Paginacao reversa (cursor-based)

O chat carrega as mensagens mais recentes primeiro e carrega mais conforme o usuario scrolla pra cima.

**Request:**
```
GET /conversations/:id/messages?limit=50&before=<cursor>
```

**Parametros:**
- `limit` (optional, default: 50, max: 200) — quantidade de mensagens a retornar
- `before` (optional) — cursor (message id ou timestamp). Retorna mensagens anteriores a esse ponto.

**Response:**
```typescript
{
  messages: SDKMessage[],  // ordenadas por tempo crescente (mais antiga primeiro)
  hasMore: boolean,        // true se existem mensagens anteriores
  cursor: string | null,   // cursor pra proxima pagina (null se nao tem mais)
}
```

**Primeira chamada (sem `before`):** retorna as ultimas `limit` mensagens.
**Scroll up:** chat chama com `before=cursor` retornado, recebe batch anterior.

### Comportamento no chat

1. **Mount:** Chat chama `GET /conversations/:id/messages?limit=50` (sem before). Renderiza de baixo pra cima. Scroll posicionado no fim.
2. **Scroll up:** Quando o usuario chega perto do topo, chat chama com `before=cursor`. Insere mensagens no topo sem mover scroll position.
3. **hasMore: false:** Chat mostra indicador discreto no topo: "Inicio da conversa".
4. **Conversa nova (sem historico):** Chat mostra empty state.

### Infinite scroll reverso

Usar `IntersectionObserver` ou `onScroll` pra detectar proximidade do topo. Threshold: 200px do topo. Debounce: 300ms. Nao disparar se `hasMore: false` ou se ja tem request em andamento.

---

## Fluxo completo

```
1. Usuario abre conversa (sessionId)
      |
2. Chat chama GET /conversations/:id/messages?limit=50
      |
3. Backbone le JSONL, pega ultimas 50, retorna com cursor
      |
4. Chat renderiza, scroll no fim
      |
5. Usuario scrolla pra cima
      |
6. Chat chama GET /conversations/:id/messages?limit=50&before=cursor
      |
7. Backbone retorna batch anterior + novo cursor + hasMore
      |
8. Chat insere no topo, mantem scroll position
      |
9. Repete ate hasMore: false
```

---

## Nova mensagem em tempo real

Quando o usuario envia mensagem:

1. Chat envia `POST /conversations/:id/messages`
2. Backbone processa, roda agente, streama `SDKMessage` via SSE
3. Chat renderiza em tempo real (streaming parcial, progress, etc — ver CHAT-RICH-MESSAGES.md)
4. Backbone persiste assistant + user + result no JSONL
5. Chat adiciona as mensagens finais ao array local

O chat nao precisa fazer GET apos enviar — ele ja tem as mensagens do stream.

---

## Conversas legacy

O backbone detecta formato do JSONL:
- Se mensagem tem `type: "assistant"` → formato novo (SDKMessage). Retorna direto.
- Se mensagem tem `role: "assistant"` sem `type` → formato legacy. Converte on-the-fly:

```typescript
// Legacy → SDKMessage
{
  role: "assistant",
  content: "texto",
  _meta: { id: "msg_123", ts: "2026-04-10T..." }
}
// Vira:
{
  type: "assistant",
  uuid: "msg_123",
  session_id: sessionId,
  message: {
    id: "msg_123",
    content: [{ type: "text", text: "texto" }],
  },
  parent_tool_use_id: null,
}
```

Conversao e transparente pro chat. O chat so conhece SDKMessage.
