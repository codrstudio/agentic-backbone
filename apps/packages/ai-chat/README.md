# @agentic-backbone/ai-chat

Componentes React de chat para agentes do Agentic Backbone. Inclui renderizadores de mensagens, display tools e componentes UI baseados em shadcn/ui v4.

## Instalacao

```bash
npm install @agentic-backbone/ai-chat
```

Peer dependencies: `react` e `react-dom` (v18 ou v19).

## CSS

Este pacote exporta seus proprios estilos Tailwind pre-compilados. O consumidor **precisa importar o CSS** para que os componentes renderizem corretamente.

```css
/* No seu CSS principal (ex: index.css, globals.css) */
@import "@agentic-backbone/ai-chat/styles.css";
```

Os estilos usam CSS variables do shadcn (`--background`, `--foreground`, `--card`, etc.), entao o tema do seu projeto e aplicado automaticamente.

### Build do CSS

Se voce clonou o repositorio, gere o CSS antes de usar:

```bash
npm run build:css --workspace=apps/packages/ai-chat
```

Ou via root:

```bash
npm run build:packages
```

## Uso basico

```tsx
import { Chat } from "@agentic-backbone/ai-chat";

function App() {
  return (
    <Chat
      apiUrl="/api/v1/ai"
      agentId="system.assistant"
      token={token}
    />
  );
}
```

## Componentes exportados

### Chat principal
- `Chat` — componente completo (input + lista de mensagens + streaming)
- `MessageList` — lista virtualizada de mensagens
- `MessageBubble` — bolha individual de mensagem
- `MessageInput` — campo de input com envio

### Parts (partes de mensagem)
- `PartRenderer` — renderizador de partes (texto, reasoning, tool invocations)
- `ReasoningBlock` — bloco de raciocinio colapsavel
- `ToolActivity` — indicador de tool call em andamento
- `ToolResult` — resultado de tool call colapsavel

### Display Renderers
- `AlertRenderer` — alertas (info, warning, error, success)
- `MetricCardRenderer` — cards de metricas
- `ChartRenderer` — graficos (line, bar, area, pie)
- `DataTableRenderer` — tabelas de dados
- `CodeBlockRenderer` — blocos de codigo com syntax highlight
- `ImageViewerRenderer` — visualizador de imagens com dialog
- `GalleryRenderer` — galeria de imagens
- E outros: `CarouselRenderer`, `ComparisonTableRenderer`, `FileCardRenderer`, `LinkPreviewRenderer`, `MapViewRenderer`, `PriceHighlightRenderer`, `ProductCardRenderer`, `ProgressStepsRenderer`, `SourcesListRenderer`, `SpreadsheetRenderer`, `StepTimelineRenderer`, `ChoiceButtonsRenderer`

### Registry
- `defaultDisplayRenderers` — mapa padrao de display tool name → componente
- `resolveDisplayRenderer(toolName, overrides?)` — resolve o renderer com suporte a overrides

### Hooks
- `useBackboneChat` — hook de chat com streaming SSE
- `ChatProvider` / `useChatContext` — context provider para estado compartilhado
