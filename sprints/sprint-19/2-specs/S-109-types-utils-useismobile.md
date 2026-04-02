# S-109 — Tipos, Utilitários e Hook useIsMobile

Criar tipos base (`Conversation`, `BackendMessage`), funções puras (`formatRelativeTime`, `buildInitialMessages`, `groupConversations`) e hook `useIsMobile`.

**Resolve:** D-015 (Tipos e utilitários), D-016 (Hook useIsMobile)
**Score de prioridade:** 10 / 8
**Dependência:** Nenhuma — desbloqueador das fases 3–6
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas

---

## 1. Objetivo

Definir os tipos canônicos de conversas no `@codrstudio/agentic-chat` e extrair funções puras do Hub que serão reutilizadas por múltiplos consumers. `buildInitialMessages` é a função de maior valor: transforma mensagens do backend (role/content/tool-call/tool-result) no formato ai-sdk (parts com tool-invocation), eliminando duplicação crítica.

---

## 2. Alterações

### 2.1 Arquivo: `src/conversations/types.ts` (NOVO)

```typescript
export interface Conversation {
  id: string;
  title?: string;
  agentId: string;
  updatedAt: string;
  starred: boolean;
  metadata?: Record<string, unknown>;
}

export interface BackendMessage {
  id?: string;
  role: string;
  content: string | unknown[];
  _meta?: {
    id?: string;
    ts?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  };
  timestamp?: string;
  metadata?: Record<string, unknown>;
}
```

**Notas:**
- `Conversation` é um subconjunto limpo do tipo `Session` do backbone — sem campos hub-specific
- `metadata` é o canal de extensão genérico para campos como `takeover_by` no Hub
- `BackendMessage` aceita qualquer objeto com `role` + `content` + `_meta` — o tipo `ConversationMessage` do Hub já conforma

### 2.2 Arquivo: `src/conversations/utils.ts` (NOVO)

Funções puras extraídas do Hub:

#### `formatRelativeTime(dateStr: string): string`

Extraída de `conversations-layout.tsx:36-46`. Retorna strings relativas em inglês por default.

```typescript
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}
```

#### `buildInitialMessages(messages: BackendMessage[]): Message[]`

Extraída de `conversation-chat.tsx:50-172`. Função pura que transforma mensagens do backend no formato ai-sdk.

Lógica principal:
1. Iterar sobre mensagens do backend
2. Para cada mensagem com `role: "assistant"` e `content` contendo tool calls, criar `UIMessage` com `parts` contendo `ToolInvocationPart`
3. Para mensagens `role: "tool"`, vincular o resultado ao `ToolInvocationPart` correspondente no assistant message anterior
4. Para mensagens simples (text), criar `UIMessage` com `parts` contendo `TextPart`
5. Preservar `_meta.id` como `id` do message e `_meta.ts` como `createdAt`

**IMPORTANTE:** Ler a implementação atual em `conversation-chat.tsx` do Hub (`D:\sources\_unowned\agentic-backbone\apps\hub\src\components\conversations\conversation-chat.tsx`) antes de implementar. A função deve produzir output idêntico.

Tipo de retorno: `Message[]` importado de `ai/react` (ou equivalente do ai-sdk já usado no pacote).

#### `groupConversations(conversations: Conversation[]): { favorites: Conversation[]; history: Conversation[] }`

Split simples por campo `starred`:

```typescript
export function groupConversations(conversations: Conversation[]): {
  favorites: Conversation[];
  history: Conversation[];
} {
  const favorites: Conversation[] = [];
  const history: Conversation[] = [];

  for (const conv of conversations) {
    if (conv.starred) {
      favorites.push(conv);
    } else {
      history.push(conv);
    }
  }

  return { favorites, history };
}
```

O consumidor faz sort/filter antes de passar.

### 2.3 Arquivo: `src/hooks/useIsMobile.ts` (NOVO)

Hook que usa `window.matchMedia` com breakpoint configurável:

```typescript
import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
```

---

## 3. Regras de Implementação

- `buildInitialMessages` deve ser implementada lendo a versão atual do Hub — não reescrever do zero
- `formatRelativeTime` retorna strings em inglês (o consumidor pode fazer override via `renderTimestamp` prop nos componentes)
- `groupConversations` não faz sort — apenas split. Consumers controlam a ordenação
- Import de `Message` type do ai-sdk: verificar qual é o type path correto no pacote (`ai/react` ou `@ai-sdk/react`)
- Import paths com extensão `.js` (ESM)

---

## 4. Critérios de Aceite

- [ ] `Conversation` interface exportada com campos: id, title?, agentId, updatedAt, starred, metadata?
- [ ] `BackendMessage` interface exportada com campos: id?, role, content, _meta?, timestamp?, metadata?
- [ ] `formatRelativeTime` retorna "now", "Xm ago", "Xh ago", "Xd ago"
- [ ] `buildInitialMessages` transforma mensagens backend para formato ai-sdk com tool-invocation parts
- [ ] `buildInitialMessages` produz output idêntico à versão do Hub
- [ ] `groupConversations` retorna `{ favorites, history }` separados por `starred`
- [ ] `useIsMobile` retorna `true` quando viewport < breakpoint
- [ ] `useIsMobile` reage a mudanças de viewport (listener de `change`)
- [ ] Build compila sem erros
