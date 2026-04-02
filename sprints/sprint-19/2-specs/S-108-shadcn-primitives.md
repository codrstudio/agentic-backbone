# S-108 — Primitivos shadcn: Input, DropdownMenu, Skeleton

Adicionar 3 primitivos shadcn ao `@codrstudio/agentic-chat` em `src/ui/`, necessários para os componentes de conversas.

**Resolve:** D-014 (Primitivos shadcn Input, DropdownMenu, Skeleton + nova dep)
**Score de prioridade:** 10
**Dependência:** Nenhuma — desbloqueador absoluto
**PRP:** 25 — agentic-chat: Componentes de gerenciamento de conversas

---

## 1. Objetivo

Os novos componentes de conversas (ConversationList, ConversationBar) dependem de primitivos que ainda não existem no pacote: `Input` (busca, rename inline), `DropdownMenu` (menu de ações da barra), `Skeleton` (loading states). Adicionar seguindo o padrão shadcn já adotado no pacote.

---

## 2. Alterações

### 2.1 Arquivo: `src/ui/input.tsx` (NOVO)

Input HTML puro com estilização shadcn (sem Radix — é um `<input>` com `cn()`):

```tsx
import * as React from "react";
import { cn } from "../lib/utils.js";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
```

### 2.2 Arquivo: `src/ui/dropdown-menu.tsx` (NOVO)

Baseado em `@radix-ui/react-dropdown-menu`. Seguir o padrão shadcn oficial (mesma estrutura do `dialog.tsx` existente).

Exports obrigatórios:
- `DropdownMenu` (Root)
- `DropdownMenuTrigger`
- `DropdownMenuContent`
- `DropdownMenuItem`
- `DropdownMenuSeparator`

```tsx
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../lib/utils.js";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
      "transition-colors focus:bg-accent focus:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
```

### 2.3 Arquivo: `src/ui/skeleton.tsx` (NOVO)

Zero dependências. Div com `animate-pulse`:

```tsx
import { cn } from "../lib/utils.js";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />;
}

export { Skeleton };
```

### 2.4 Arquivo: `package.json` — Nova dependência

Adicionar ao `dependencies`:

```json
"@radix-ui/react-dropdown-menu": "^2"
```

Rodar `npm install` após a adição.

---

## 3. Regras de Implementação

- Seguir exatamente o padrão shadcn oficial — não inventar variantes
- Import paths com extensão `.js` (ESM)
- Usar `cn()` de `../lib/utils.js` (já existe no pacote)
- `DropdownMenu` usa Radix (como `Dialog` existente); `Input` e `Skeleton` são HTML puro com `cn()`

---

## 4. Critérios de Aceite

- [ ] `src/ui/input.tsx` exporta `Input` com props padrão de `<input>`
- [ ] `src/ui/dropdown-menu.tsx` exporta `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`
- [ ] `src/ui/skeleton.tsx` exporta `Skeleton` com `animate-pulse`
- [ ] `@radix-ui/react-dropdown-menu` adicionado ao `package.json`
- [ ] Primitivos seguem tokens shadcn (bg-popover, text-popover-foreground, etc.)
- [ ] Build compila sem erros
