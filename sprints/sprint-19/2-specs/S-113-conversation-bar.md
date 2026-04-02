# S-113 — ConversationBar: Barra de Contexto no Topo do Chat

Criar o componente controlado `ConversationBar` — barra com título, agente, dropdown de ações e slots para extensão.

**Resolve:** D-021 (ConversationBar componente controlado)
**Score de prioridade:** 9
**Dependência:** S-108 (DropdownMenu, Skeleton), S-109 (tipos), S-111 (RenameDialog, DeleteDialog)
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas

---

## 1. Objetivo

Segunda maior redução no Hub (~200 linhas). Barra de contexto com título da conversa, badge de agente, dropdown de ações (renomear/exportar/excluir) e slots para features hub-specific (TakeoverButton, TakeoverBanner, ApprovalInlineActions).

---

## 2. Alterações

### 2.1 Arquivo: `src/conversations/ConversationBar.tsx` (NOVO)

```tsx
interface ConversationBarProps {
  // Dados
  title?: string;
  agentLabel?: string;
  isLoading?: boolean;

  // Ações
  onRename?: (title: string) => void;
  onExport?: () => void;
  onDelete?: () => void;
  onBack?: () => void;                          // mostra seta voltar (mobile)

  // Estado dos dialogs (controlled mode — se não fornecidos, gerencia internamente)
  renameOpen?: boolean;
  onRenameOpenChange?: (open: boolean) => void;
  deleteOpen?: boolean;
  onDeleteOpenChange?: (open: boolean) => void;

  // Pending states
  isPendingRename?: boolean;
  isPendingDelete?: boolean;

  // Labels
  renameLabel?: string;         // default: "Rename"
  exportLabel?: string;         // default: "Export"
  deleteLabel?: string;         // default: "Delete"
  untitledLabel?: string;       // default: "Untitled"

  // Slots de extensão
  actionsExtra?: React.ReactNode;      // antes do dropdown (ex: TakeoverButton)
  menuItemsExtra?: React.ReactNode;    // DropdownMenuItems extras
  afterBar?: React.ReactNode;          // abaixo da barra (ex: TakeoverBanner, Approvals)

  // Layout
  className?: string;
}
```

#### Estrutura visual

```
+------------------------------------------------------+
| [←] Título da conversa   [agent badge] [extras] [⋮]  |
+------------------------------------------------------+
| [afterBar]                                            |
```

#### Detalhes de comportamento

**Seta voltar:**
- Renderiza `ArrowLeft` icon (lucide) quando `onBack` é fornecido
- Click dispara `onBack`
- Usado em mobile para voltar à lista de conversas

**Título:**
- Exibe `title ?? untitledLabel`
- Truncado com `truncate` se longo
- Em `text-sm font-medium`

**Badge de agente:**
- `Badge variant="secondary"` com `agentLabel`
- Só renderiza quando `agentLabel` é fornecido

**Slot `actionsExtra`:**
- Renderizado entre o badge e o botão de dropdown
- Hub coloca `TakeoverButton` aqui

**Dropdown menu (botão `⋮`):**
- Botão `MoreVertical` icon (lucide), `variant="ghost" size="icon"`
- Menu items:
  1. **Renomear** — ícone `Pencil`, texto `renameLabel`. Click abre `RenameDialog`
  2. **Exportar** — ícone `Download`, texto `exportLabel`. Click dispara `onExport`
  3. **`menuItemsExtra`** — slot para items extras do Hub
  4. `DropdownMenuSeparator`
  5. **Excluir** — ícone `Trash2`, texto `deleteLabel`, classe `text-destructive`. Click abre `DeleteDialog`

**Dialogs:**
- **RenameDialog**: se `renameOpen`/`onRenameOpenChange` fornecidos → controlled mode. Se não → gerencia estado internamente (uncontrolled mode). `onConfirm` dispara `onRename(value)`
- **DeleteDialog**: mesma lógica controlled/uncontrolled. `onConfirm` dispara `onDelete()`

**Slot `afterBar`:**
- Renderizado abaixo da barra principal
- Hub coloca `TakeoverBanner` + `ApprovalInlineActions`

**Loading state:**
- Quando `isLoading === true`, exibe `Skeleton` no lugar do título (`h-5 w-40`)

**Barra:**
- Layout flex com `items-center gap-2`
- Bordas: `border-b` inferior
- Padding: `px-4 py-2`

---

## 3. Regras de Implementação

- Ler `conversation-chat.tsx` do Hub para referência visual da barra atual
- Componente é **totalmente controlado** — sem fetch, sem navegação
- Pattern controlled/uncontrolled para dialogs: checar se `renameOpen !== undefined` para decidir modo
- Estado interno do rename input (valor do dialog) é gerenciado pelo componente
- Usar `cn()` para composição de classes
- Icons de `lucide-react` (ArrowLeft, Pencil, Download, Trash2, MoreVertical)
- Import paths com extensão `.js` (ESM)

---

## 4. Critérios de Aceite

- [ ] Renderiza título + badge de agente
- [ ] `onBack` mostra seta voltar à esquerda
- [ ] Dropdown com Renomear, Exportar, menuItemsExtra, Excluir
- [ ] Renomear abre RenameDialog, Enter confirma, dispara `onRename(title)`
- [ ] Exportar dispara `onExport`
- [ ] Excluir abre DeleteDialog, confirmar dispara `onDelete`
- [ ] Controlled mode: `renameOpen`/`onRenameOpenChange` controlam dialog externamente
- [ ] Uncontrolled mode: sem props de dialog, componente gerencia internamente
- [ ] `actionsExtra` renderiza antes do dropdown
- [ ] `menuItemsExtra` renderiza dentro do dropdown
- [ ] `afterBar` renderiza abaixo da barra
- [ ] Loading state: Skeleton no título
- [ ] `isPendingRename` desabilita botão "Save" no RenameDialog
- [ ] `isPendingDelete` desabilita botão "Delete" no DeleteDialog
- [ ] Todos os labels têm defaults em inglês
- [ ] Build compila sem erros
