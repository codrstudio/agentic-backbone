# S-112 — ConversationList: Componente Principal da Sidebar

Criar o componente controlado `ConversationList` — sidebar de conversas com busca, grupos colapsáveis, star, rename, paginação e slots de extensão.

**Resolve:** D-020 (ConversationList componente principal)
**Score de prioridade:** 10
**Dependência:** S-108 (Input, Skeleton), S-109 (tipos), S-111 (CollapsibleGroup, ConversationListItem)
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas

---

## 1. Objetivo

Componente de maior impacto do PRP — representa ~300 linhas removidas do Hub. Totalmente controlado: recebe dados e callbacks como props, não faz fetch nem navega. Slots de extensão garantem que features hub-specific (operator filter, agent filter, takeover badge) não vazem para a biblioteca.

---

## 2. Alterações

### 2.1 Arquivo: `src/conversations/ConversationList.tsx` (NOVO)

```tsx
interface ConversationListProps {
  // Dados
  conversations: Conversation[];
  activeId?: string;
  isLoading?: boolean;

  // Busca
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;                    // default: "Search..."

  // Grupos (se não fornecidos, deriva de conversations por starred)
  favorites?: Conversation[];
  history?: Conversation[];
  favoritesLabel?: string;                       // default: "Favorites"
  historyLabel?: string;                         // default: "History"

  // Paginação
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: string;                        // default: "Load more"
  remainingCount?: number;

  // Callbacks
  onSelect?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onStar?: (id: string, starred: boolean) => void;
  onCreateRequest?: () => void;

  // Resolvers
  getAgentLabel?: (agentId: string) => string;

  // Slots de extensão
  headerExtra?: React.ReactNode;                 // entre busca e botão +
  filterExtra?: React.ReactNode;                 // abaixo do header
  itemBadgesExtra?: (conv: Conversation) => React.ReactNode;

  // Empty state
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;                           // default: "No conversations"
  emptyDescription?: string;                     // default: "Start a conversation to begin."

  // Layout
  className?: string;
}
```

#### Estado interno

O componente gerencia internamente:
- `renamingId: string | null` — qual conversa está sendo renomeada
- `renameValue: string` — valor atual do input de rename
- `favoritesOpen: boolean` — estado do grupo Favoritos (default: `true`)
- `historyOpen: boolean` — estado do grupo Histórico (default: `true`)

#### Estrutura visual

```
+----------------------------------+
| [Search...]  [headerExtra]  [+]  |
+----------------------------------+
| [filterExtra]                    |
+----------------------------------+
| ▶ Favorites                      |
|   [ConversationListItem]         |
|   [ConversationListItem]         |
| ▶ History                        |
|   [ConversationListItem]         |
|   [ConversationListItem]         |
|   ...                            |
|   [Load more (N remaining)]      |
+----------------------------------+
```

#### Detalhes de comportamento

**Header:**
- `Input` de busca com ícone `Search` (lucide) à esquerda
- `headerExtra` slot renderizado entre busca e botão +
- Botão `+` (Plus icon) à direita, dispara `onCreateRequest`

**filterExtra:**
- Renderizado abaixo do header, acima dos grupos
- Usado pelo Hub para o `AgentFilterSelect`

**Grupos:**
- Se `favorites`/`history` não fornecidos, calcula via `groupConversations(conversations)`
- Grupo "Favorites" com ícone `Star` — só renderiza se houver favoritos
- Grupo "History" — sempre renderiza
- Ambos usam `CollapsibleGroup` internamente

**Items:**
- Cada conversa renderiza um `ConversationListItem`
- `isActive` determinado por `conversation.id === activeId`
- `agentLabel` resolvido via `getAgentLabel?.(conversation.agentId)`
- `badgesExtra` resolvido via `itemBadgesExtra?.(conversation)`
- Click dispara `onSelect(id)`
- Star toggle dispara `onStar(id, !conversation.starred)`
- Rename: double-click no pencil inicia rename inline, Enter confirma via `onRename(id, renameValue)`, Escape cancela

**Paginação:**
- "Load more" aparece no final do grupo History quando `hasMore === true`
- Texto: `loadMoreLabel` + ` (${remainingCount} remaining)` (se `remainingCount` fornecido)
- Click dispara `onLoadMore`
- Usa `Button variant="ghost" size="sm"`

**Loading state:**
- Quando `isLoading === true`, renderiza 8 `Skeleton` de `h-16 w-full rounded-lg` em vez dos grupos

**Empty state:**
- Quando `!isLoading` e `conversations.length === 0`
- Ícone centralizado (default: `MessageSquare` de lucide) + `emptyTitle` + `emptyDescription`
- Classes: `text-center text-muted-foreground`

**Scroll:**
- Área de grupos usa `ScrollArea` (já existe em `src/ui/scroll-area.tsx`) com `flex-1 overflow-hidden`

---

## 3. Regras de Implementação

- Ler `conversations-layout.tsx` do Hub para referência visual
- Componente é **totalmente controlado** — sem fetch, sem navegação, sem router
- Estado de rename é interno (não exposto via props) — mais ergonômico para consumers
- `getAgentLabel` é resolver puro: recebe `agentId`, retorna string. Se não fornecido, mostra `agentId` direto
- Todos os labels têm defaults em inglês
- Usar `cn()` para composição de classes
- Import paths com extensão `.js` (ESM)

---

## 4. Critérios de Aceite

- [ ] Renderiza lista com dados mockados (favorites + history)
- [ ] Busca controlada via `search` / `onSearchChange`
- [ ] Grupos Favoritos e Histórico colapsam independentemente
- [ ] Grupo Favoritos não renderiza quando lista vazia
- [ ] Star toggle dispara `onStar(id, !starred)`
- [ ] Rename inline: pencil abre input, Enter confirma via `onRename(id, title)`, Escape cancela
- [ ] `onCreateRequest` disparado pelo botão +
- [ ] `onSelect` disparado ao clicar em item
- [ ] "Load more" aparece quando `hasMore === true`
- [ ] Loading state: 8 Skeletons
- [ ] Empty state: ícone + título + descrição
- [ ] Slots `headerExtra`, `filterExtra`, `itemBadgesExtra` renderizam conteúdo
- [ ] Active item tem `bg-accent`
- [ ] Scroll funciona com muitas conversas
- [ ] Build compila sem erros
