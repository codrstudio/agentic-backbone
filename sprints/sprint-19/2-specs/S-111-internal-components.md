# S-111 — Componentes Internos: CollapsibleGroup, ConversationListItem, RenameDialog, DeleteDialog

Criar os 4 componentes internos (não exportados diretamente) que servem de blocos construtores para `ConversationList` e `ConversationBar`.

**Resolve:** D-018 (CollapsibleGroup + ConversationListItem), D-019 (RenameDialog + DeleteDialog)
**Score de prioridade:** 9 / 8
**Dependência:** S-108 (Input, Skeleton), S-109 (tipos Conversation)
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas

---

## 1. Objetivo

Extrair do Hub os blocos construtores já validados em produção (`conversations-layout.tsx:54-197`) e criar dialogs reutilizados por ambos os componentes principais. Estes componentes são **internos** — consumidos apenas por `ConversationList` e `ConversationBar`, não exportados na API pública.

---

## 2. Alterações

### 2.1 Arquivo: `src/conversations/CollapsibleGroup.tsx` (NOVO)

Extraído de `conversations-layout.tsx:54-81` do Hub.

```tsx
interface CollapsibleGroupProps {
  label: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
```

**Comportamento:**
- Usa primitivo `Collapsible` do Radix (já existe em `src/ui/collapsible.tsx`)
- Chevron icon à esquerda do label, rotaciona 90° quando `open` (via `rotate-90` condicional)
- Label em `text-xs font-medium text-muted-foreground uppercase tracking-wide`
- Header clicável dispara `onToggle`
- Children renderizados dentro do `CollapsibleContent`

### 2.2 Arquivo: `src/conversations/ConversationListItem.tsx` (NOVO)

Extraído de `conversations-layout.tsx:83-197` do Hub.

```tsx
interface ConversationListItemProps {
  conversation: Conversation;
  agentLabel?: string;
  isActive?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
  onStartRename?: (e: React.MouseEvent) => void;
  onToggleStar?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  badgesExtra?: React.ReactNode;
  className?: string;
}
```

**Layout:**
```
+-------------------------------------------+
| ★  [agent badge] [badgesExtra] [5m ago]   |
|    Título da conversa              [✏️]    |
+-------------------------------------------+
```

- **Star icon** à esquerda: `Star` (lucide). Amarelo preenchido (`fill-yellow-400 text-yellow-400`) quando `starred`, outline quando não. Click dispara `onToggleStar` (com `e.stopPropagation()`)
- **Área central clicável**: dispara `onClick`
  - Primeira linha: badge de agente (`Badge variant="secondary"` com `agentLabel`) + `badgesExtra` slot + timestamp via `formatRelativeTime(conversation.updatedAt)` alinhado à direita
  - Segunda linha: título (`conversation.title ?? "Untitled"`) em `text-sm truncate`
- **Pencil icon** à direita: visível apenas no hover (`opacity-0 group-hover:opacity-100`). Click dispara `onStartRename` (com `e.stopPropagation()`)
- **Inline rename**: quando `isRenaming === true`, substitui o título por um `Input` com `renameValue`. Enter dispara `onRenameCommit`, Escape dispara `onRenameCancel`. Input recebe `autoFocus`
- **Active state**: `bg-accent` quando `isActive`
- **Hover**: `hover:bg-accent/50` quando não active
- Container com `cursor-pointer rounded-lg px-3 py-2`

### 2.3 Arquivo: `src/conversations/RenameDialog.tsx` (NOVO)

Dialog modal para renomear conversa.

```tsx
interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  isPending?: boolean;
  title?: string;           // default: "Rename conversation"
  placeholder?: string;     // default: "Conversation title"
  cancelLabel?: string;     // default: "Cancel"
  confirmLabel?: string;    // default: "Save"
}
```

**Comportamento:**
- Usa primitivo `Dialog` existente (`src/ui/dialog.tsx`)
- Input com `value`/`onValueChange` controlado
- Enter no input dispara `onConfirm`
- Botão "Save" desabilitado quando `value` é vazio ou `isPending`
- Botão "Cancel" fecha o dialog via `onOpenChange(false)`
- Foco automático no input ao abrir

### 2.4 Arquivo: `src/conversations/DeleteDialog.tsx` (NOVO)

Dialog de confirmação para excluir conversa.

```tsx
interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
  title?: string;           // default: "Delete conversation"
  description?: string;     // default: "This conversation will be permanently removed."
  cancelLabel?: string;     // default: "Cancel"
  confirmLabel?: string;    // default: "Delete"
}
```

**Comportamento:**
- Usa primitivo `Dialog` existente
- Botão "Delete" usa `variant="destructive"`
- Botão desabilitado quando `isPending`
- Botão "Cancel" fecha via `onOpenChange(false)`

---

## 3. Regras de Implementação

- Ler a implementação atual no Hub (`conversations-layout.tsx`) antes de implementar — preservar comportamento visual
- Componentes são **internos** — não adicionar ao barrel export público
- Usar `cn()` para composição de classes
- Icons de `lucide-react` (Star, Pencil, ChevronRight)
- Import paths com extensão `.js` (ESM)
- `formatRelativeTime` importado de `./utils.js`
- `Conversation` importado de `./types.js`

---

## 4. Critérios de Aceite

- [ ] `CollapsibleGroup` renderiza label + chevron rotacionável + children colapsáveis
- [ ] `ConversationListItem` mostra star, badge de agente, título, timestamp, pencil no hover
- [ ] Star icon muda aparência quando `starred === true`
- [ ] Inline rename funciona: input com autoFocus, Enter confirma, Escape cancela
- [ ] `badgesExtra` slot renderiza conteúdo extra na linha de badges
- [ ] Active state aplica `bg-accent`
- [ ] `RenameDialog` abre dialog com input controlado, Enter confirma, botão desabilitado quando vazio
- [ ] `DeleteDialog` abre dialog com botão destructive, desabilitado quando isPending
- [ ] Todos os labels têm defaults em inglês e aceitam override via props
- [ ] Build compila sem erros
