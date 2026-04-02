# S-114 — Barrel Exports: API Pública do Pacote

Criar barrel export de conversas e atualizar `src/index.ts` para expor os novos componentes, hooks e utilitários.

**Resolve:** D-022 (Barrel exports)
**Score de prioridade:** 7
**Dependência:** S-110 (useConversations), S-112 (ConversationList), S-113 (ConversationBar)
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas

---

## 1. Objetivo

Integração final que torna os novos componentes disponíveis como parte da API pública do `@codrstudio/agentic-chat`. Garante API limpa e consistente com o restante do pacote.

---

## 2. Alterações

### 2.1 Arquivo: `src/conversations/index.ts` (NOVO)

```typescript
// Componentes
export { ConversationList } from "./ConversationList.js";
export type { ConversationListProps } from "./ConversationList.js";

export { ConversationBar } from "./ConversationBar.js";
export type { ConversationBarProps } from "./ConversationBar.js";

// Hooks
export { useConversations } from "./useConversations.js";
export type { UseConversationsOptions, UseConversationsReturn } from "./useConversations.js";

export { useIsMobile } from "../hooks/useIsMobile.js";

// Utilitários
export { formatRelativeTime, buildInitialMessages, groupConversations } from "./utils.js";

// Tipos
export type { Conversation, BackendMessage } from "./types.js";
```

**Nota:** `CollapsibleGroup`, `ConversationListItem`, `RenameDialog`, `DeleteDialog` **não** são exportados — são componentes internos.

### 2.2 Arquivo: `src/index.ts` (ATUALIZAR)

Adicionar re-exports ao final do arquivo existente:

```typescript
// Conversation management
export {
  ConversationList,
  ConversationBar,
  useConversations,
  useIsMobile,
  formatRelativeTime,
  buildInitialMessages,
  groupConversations,
} from "./conversations/index.js";

export type {
  ConversationListProps,
  ConversationBarProps,
  UseConversationsOptions,
  UseConversationsReturn,
  Conversation,
  BackendMessage,
} from "./conversations/index.js";
```

---

## 3. Regras de Implementação

- Manter a ordem: componentes → hooks → utilitários → tipos (mesmo padrão do barrel existente)
- Import paths com extensão `.js` (ESM)
- Não exportar componentes internos (CollapsibleGroup, ConversationListItem, RenameDialog, DeleteDialog)
- Verificar que `ConversationListProps` e `ConversationBarProps` são exportados como `type` (type-only export)

---

## 4. Critérios de Aceite

- [ ] `import { ConversationList, ConversationBar } from "@codrstudio/agentic-chat"` funciona
- [ ] `import { useConversations, useIsMobile } from "@codrstudio/agentic-chat"` funciona
- [ ] `import { formatRelativeTime, buildInitialMessages, groupConversations } from "@codrstudio/agentic-chat"` funciona
- [ ] `import type { Conversation, BackendMessage } from "@codrstudio/agentic-chat"` funciona
- [ ] Componentes internos **não** são acessíveis via import público
- [ ] Build compila sem erros
