# S-110 — Hook useConversations (Standalone)

Criar hook standalone para fetch e gerenciamento de conversas sem dependência de TanStack Query.

**Resolve:** D-017 (Hook useConversations standalone)
**Score de prioridade:** 8
**Dependência:** S-109 (tipos Conversation)
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas

---

## 1. Objetivo

Habilitar uso do `@codrstudio/agentic-chat` em apps sem data layer próprio (ex: app chat standalone). O hook encapsula fetch + estado usando apenas `useState` + `useCallback` + `fetch` nativo — zero dependência de library de estado.

O Hub **ignora** este hook e continua usando TanStack Query, passando dados diretamente para os componentes via props.

---

## 2. Alterações

### 2.1 Arquivo: `src/conversations/useConversations.ts` (NOVO)

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Conversation } from "./types.js";

export interface UseConversationsOptions {
  endpoint?: string;       // base URL, default: ""
  token?: string;          // Bearer token
  fetcher?: (url: string, init?: RequestInit) => Promise<Response>; // override fetch
  autoFetch?: boolean;     // default: true
}

export interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (agentId: string) => Promise<Conversation>;
  rename: (id: string, title: string) => Promise<void>;
  star: (id: string, starred: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  exportUrl: (id: string, format?: "json" | "markdown") => string;
}

export function useConversations(options?: UseConversationsOptions): UseConversationsReturn {
  // ...implementação
}
```

#### Detalhes de implementação

**Fetcher:**
- Default: `fetch` nativo com `Authorization: Bearer ${token}` no header (quando `token` fornecido)
- Inclui `credentials: "include"` para suportar cookie auth
- Override total via prop `fetcher`

**API paths** (relativo a `endpoint`):
- `GET /api/v1/ai/conversations` → lista
- `POST /api/v1/ai/conversations` → criar (`{ agentId }`)
- `PATCH /api/v1/ai/conversations/:id` → renomear (`{ title }`)
- `PATCH /api/v1/ai/conversations/:id` → star (`{ starred }`)
- `DELETE /api/v1/ai/conversations/:id` → excluir

**Comportamentos:**
- `autoFetch` (default `true`): chama `refresh()` no mount via `useEffect`
- `star()`: **optimistic update** — atualiza estado local primeiro, faz PATCH, rollback em erro
- `remove()`: remove do estado local após DELETE bem-sucedido
- `create()`: faz POST, adiciona ao estado local, retorna a conversa criada
- `rename()`: faz PATCH, atualiza título no estado local
- `exportUrl(id, format)`: retorna `${endpoint}/api/v1/ai/conversations/${id}/export?format=${format}&token=${token}` para download direto
- `refresh()`: refetch completo da lista

**Estado:**
- `conversations`: `Conversation[]` — lista atual
- `isLoading`: `boolean` — true durante fetch inicial e refresh
- `error`: `Error | null` — último erro (limpo em operações bem-sucedidas)

---

## 3. Regras de Implementação

- Zero dependências externas — apenas React hooks nativos + fetch
- Paths de API idênticos aos usados pelo Hub (verificar `apps/hub/src/api/conversations.ts`)
- Optimistic update apenas em `star()` — as outras operações aguardam confirmação do backend
- Não fazer retry automático — consumers implementam retry se necessário
- Import paths com extensão `.js` (ESM)

---

## 4. Critérios de Aceite

- [ ] Hook retorna `conversations`, `isLoading`, `error`, `refresh`, `create`, `rename`, `star`, `remove`, `exportUrl`
- [ ] `autoFetch: true` faz fetch no mount
- [ ] `autoFetch: false` não faz fetch no mount
- [ ] `star()` faz update otimista (estado local atualizado antes do PATCH)
- [ ] `star()` faz rollback em caso de erro no PATCH
- [ ] `remove()` remove do estado local após DELETE
- [ ] `create()` retorna a conversa criada e adiciona ao estado
- [ ] `exportUrl()` retorna URL com `?token=` para download direto
- [ ] `fetcher` prop permite override total do fetch
- [ ] `token` prop é injetado no header Authorization
- [ ] Build compila sem erros
