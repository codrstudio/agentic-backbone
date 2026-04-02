# S-115 — Hub Refactor: Consumir Componentes do agentic-chat

Refatorar `conversations-layout.tsx` (~565→~120 linhas) e `conversation-chat.tsx` (~459→~100 linhas) para consumir componentes do `@codrstudio/agentic-chat`, e ajustar o mapper `sessionToConversation`.

**Resolve:** D-023 (Hub refactor conversations-layout), D-024 (Hub refactor conversation-chat), D-025 (metadata no sessionToConversation)
**Score de prioridade:** 9 / 9 / 6
**Dependência:** S-114 (exports do agentic-chat disponíveis)
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas
**Repositório:** `D:\sources\_unowned\agentic-backbone` (apps/hub)

---

## 1. Objetivo

Validar o design dos componentes em contexto real. Se os slots funcionarem corretamente, o Hub não perde nenhuma feature. Redução total estimada: ~800 linhas.

---

## 2. Alterações

### 2.1 Arquivo: `apps/hub/src/api/conversations.ts` — Mapper com metadata

Ajustar `sessionToConversation` para incluir campo `metadata`:

```typescript
function sessionToConversation(s: Session): Conversation & {
  takeover_by: string | null;
  takeover_at: string | null;
} {
  return {
    id: s.session_id,
    agentId: s.agent_id,
    title: s.title ?? undefined,
    updatedAt: s.updated_at,
    starred: s.starred === 1,
    takeover_by: s.takeover_by,
    takeover_at: s.takeover_at,
    metadata: {
      takeover_by: s.takeover_by,
      takeover_at: s.takeover_at,
    },
  };
}
```

**Mantém** `takeover_by` e `takeover_at` como campos diretos para compatibilidade com código existente do Hub. **Adiciona** `metadata` para que `itemBadgesExtra` possa ler via `conv.metadata?.takeover_by` usando o tipo base `Conversation`.

### 2.2 Arquivo: `apps/hub/src/components/conversations/conversations-layout.tsx` — Refactor

De ~565 para ~120 linhas.

**Imports novos:**
```typescript
import { ConversationList, groupConversations } from "@codrstudio/agentic-chat";
```

**Manter no Hub (TanStack Query + Router):**
- `useQuery(conversationsQueryOptions())` — fetch de conversas
- `useQuery(agentsQueryOptions())` — fetch de agentes
- Mutations: `renameMutation`, `starMutation` (com optimistic update via `queryClient`), `createMutation`
- Filtering hub-specific: `agentFilter` + `operatorFilter` via `useMemo`
- Navegação: `useNavigate()` para `onSelect`
- New conversation dialog (agent selector) — permanece no Hub

**Remover do arquivo:**
- `CollapsibleGroup` component local
- `ConversationListItem` component local
- `formatRelativeTime` function local
- Toda lógica de rename inline (input, commits, state)
- Toda renderização manual de items
- Lógica de star/unstar visual (agora no componente)

**Passar via slots:**
- `headerExtra`: botão de filtro por operador
- `filterExtra`: `AgentFilterSelect` (quando não `fixedAgentId` e mais de 1 agente)
- `itemBadgesExtra`: badge "Op" quando `conv.metadata?.takeover_by` existe

**Labels pt-BR:**
```tsx
searchPlaceholder="Buscar..."
favoritesLabel="Favoritos"
historyLabel="Histórico"
loadMoreLabel="Carregar mais"
emptyTitle="Nenhuma conversa"
emptyDescription="Inicie uma conversa com um agente."
```

### 2.3 Arquivo: `apps/hub/src/components/conversations/conversation-chat.tsx` — Refactor

De ~459 para ~100 linhas.

**Imports novos:**
```typescript
import { ConversationBar, buildInitialMessages } from "@codrstudio/agentic-chat";
import { Chat } from "@codrstudio/agentic-chat";
```

**Manter no Hub:**
- `useQuery` para conversation, agents, session, existingMessages
- Mutations: `renameMutation`, `deleteMutation`, `takeoverMutation`, `releaseMutation`
- `OrchestrationSidebar` — permanece no Hub
- Lógica de takeover (isUnderTakeover)
- Token via `useAuthStore`

**Remover do arquivo:**
- `buildInitialMessages` function local (importar do agentic-chat)
- `RenameDialog` inline
- `DeleteDialog` inline
- Header bar manual (título + badge + dropdown construídos manualmente)
- Dropdown menu manual

**Passar via slots:**
```tsx
<ConversationBar
  title={conversation.title}
  agentLabel={agentLabel}
  onRename={(title) => renameMutation.mutate(title)}
  onExport={handleExport}
  onDelete={() => deleteMutation.mutate()}
  onBack={isMobile ? () => navigate({ to: basePath }) : undefined}
  isPendingRename={renameMutation.isPending}
  isPendingDelete={deleteMutation.isPending}
  renameLabel="Renomear"
  exportLabel="Exportar"
  deleteLabel="Excluir"
  untitledLabel="Sem título"
  actionsExtra={!isUnderTakeover && <TakeoverButton ... />}
  afterBar={
    <>
      {isUnderTakeover && session?.takeover_by && session?.takeover_at && (
        <TakeoverBanner ... />
      )}
      <ApprovalInlineActions sessionId={id} />
    </>
  }
/>
```

**Chat com buildInitialMessages:**
```tsx
<Chat
  endpoint=""
  token={token}
  sessionId={id}
  initialMessages={buildInitialMessages(existingMessages ?? [])}
  className="flex-1 flex flex-col overflow-hidden"
/>
```

---

## 3. Regras de Implementação

- Ler os arquivos atuais do Hub **completamente** antes de refatorar
- Manter **todo** o comportamento existente — zero regressão
- Mutations com optimistic update (star) devem continuar usando `queryClient.setQueryData`
- Features hub-specific (takeover, approvals, orchestration, agent filter, operator filter) permanecem no Hub
- Não alterar nenhum endpoint do backend
- Não alterar a API pública do `Chat` component
- Testar com `npm run build` no workspace do Hub
- Testar com `npm run dev:all` para validar que tudo funciona

---

## 4. Critérios de Aceite

- [ ] Sidebar de conversas funciona idêntico ao atual
- [ ] Busca por título funciona
- [ ] Filtro por agente funciona (via `filterExtra` slot)
- [ ] Filtro por operador funciona (via `headerExtra` slot)
- [ ] Star/unstar com optimistic update funciona
- [ ] Rename na sidebar funciona
- [ ] Nova conversa (dialog com agent selector) funciona
- [ ] Barra de contexto mostra título + agente
- [ ] Menu: Renomear, Exportar, Excluir funcionam
- [ ] TakeoverButton aparece no slot `actionsExtra`
- [ ] TakeoverBanner aparece no slot `afterBar`
- [ ] ApprovalInlineActions aparece no slot `afterBar`
- [ ] Orchestration sidebar continua funcionando
- [ ] Mobile: sidebar esconde quando chat ativo, seta voltar funciona
- [ ] `sessionToConversation` retorna campo `metadata` com `takeover_by`/`takeover_at`
- [ ] `npm run build` compila sem erro (Hub)
- [ ] `npm run dev:all` funciona sem regressão visual
