# Integração React — Componente de Chat

## Opção 1: Componente pronto `<Chat />`

O pacote `@codrstudio/openclaude-chat` fornece um componente de chat completo com UI (input, lista de mensagens, upload de arquivos, markdown rendering).

### Instalação

```bash
npm install @codrstudio/openclaude-chat
```

**Peer dependencies necessárias:**
```bash
npm install react react-dom @ai-sdk/react
```

### Uso básico

```tsx
import { Chat } from "@codrstudio/openclaude-chat";
import "@codrstudio/openclaude-chat/styles.css";

const API_KEY = "sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9";
const BACKBONE_URL = "http://localhost:6002";

function AgentChat({ sessionId }: { sessionId: string }) {
  return (
    <Chat
      endpoint={BACKBONE_URL}
      token={API_KEY}
      sessionId={sessionId}
      enableAttachments={true}
      enableRichContent={true}
      placeholder="Digite sua mensagem..."
    />
  );
}
```

### Props do `<Chat />`

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `endpoint` | `string` | — | URL base do backbone (sem `/api/v1/ai`) |
| `token` | `string` | — | API key ou JWT. Se vazio, usa cookies |
| `sessionId` | `string` | — | ID da sessão (obtido via POST /conversations) |
| `initialMessages` | `Message[]` | `[]` | Mensagens pré-carregadas |
| `placeholder` | `string` | — | Placeholder do input |
| `header` | `ReactNode` | — | Header customizado |
| `footer` | `ReactNode` | — | Footer customizado |
| `className` | `string` | — | Classes CSS adicionais |
| `enableAttachments` | `boolean` | `true` | Habilitar upload de arquivos |
| `enableVoice` | `boolean` | `true` | Habilitar input de voz |
| `enableRichContent` | `boolean` | `true` | Habilitar display tools (cards, gráficos) |
| `displayRenderers` | `DisplayRendererMap` | — | Renderers customizados para display tools |

---

## Opção 2: Hook `useOpenClaudeChat` (UI customizada)

Se quiser construir sua própria UI, use o hook diretamente:

```tsx
import { useOpenClaudeChat } from "@codrstudio/openclaude-chat";

const API_KEY = "sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9";

function MyChat({ sessionId }: { sessionId: string }) {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    isUploading,
    error,
    stop,
    reload,
    buildAttachmentUrl,
  } = useOpenClaudeChat({
    endpoint: "http://localhost:6002",
    token: API_KEY,
    sessionId,
    enableRichContent: true,
  });

  return (
    <div>
      {/* Lista de mensagens */}
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}

      {/* Indicador de carregamento */}
      {isLoading && <div>Pensando...</div>}

      {/* Erro */}
      {error && <div style={{ color: "red" }}>{error.message}</div>}

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite..."
        />
        <button type="submit" disabled={isLoading}>
          Enviar
        </button>
        {isLoading && <button onClick={stop}>Parar</button>}
      </form>
    </div>
  );
}
```

### Retorno do hook

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `messages` | `Message[]` | Array de mensagens (user + assistant) |
| `input` | `string` | Valor atual do input |
| `setInput` | `(v: string) => void` | Setter do input |
| `handleSubmit` | `(e, attachments?) => void` | Submit do form. Aceita attachments opcionais |
| `isLoading` | `boolean` | `true` enquanto aguarda resposta |
| `isUploading` | `boolean` | `true` durante upload de arquivos |
| `error` | `Error \| null` | Erro (rede, timeout, resposta vazia) |
| `stop` | `() => void` | Para a geração em andamento |
| `reload` | `() => Promise<void>` | Reenvia a última mensagem |
| `buildAttachmentUrl` | `(ref: string) => string` | Monta URL de attachment com token |

---

## Opção 3: `ChatProvider` (context pattern)

Para distribuir o estado do chat entre componentes:

```tsx
import { ChatProvider, useChatContext } from "@codrstudio/openclaude-chat";

function App({ sessionId }: { sessionId: string }) {
  return (
    <ChatProvider
      endpoint="http://localhost:6002"
      token="sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9"
      sessionId={sessionId}
    >
      <Header />
      <MessageArea />
      <InputArea />
    </ChatProvider>
  );
}

function MessageArea() {
  const { messages, isLoading } = useChatContext();
  // ... renderizar mensagens
}

function InputArea() {
  const { input, setInput, handleSubmit } = useChatContext();
  // ... renderizar input
}
```

---

## Opção 4: HTTP puro (sem SDK)

Se não quiser usar React ou o pacote ai-chat, integre via fetch:

```typescript
const API_KEY = "sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9";
const BASE = "http://localhost:6002/api/v1/ai";

// 1. Criar sessão
const session = await fetch(`${BASE}/conversations`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ agentId: "system.sandbox" }),
}).then(r => r.json());

const sessionId = session.session_id;

// 2. Enviar mensagem e consumir stream
const response = await fetch(
  `${BASE}/conversations/${sessionId}/messages?format=datastream`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Olá!" }),
  }
);

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  for (const line of chunk.split("\n")) {
    if (!line.trim()) continue;

    const code = line[0];
    const data = line.slice(2); // após "X:"

    switch (code) {
      case "0": // texto
        process.stdout.write(JSON.parse(data));
        break;
      case "2": // metadata (init, usage)
        console.log("meta:", JSON.parse(data));
        break;
      case "3": // erro
        console.error("error:", JSON.parse(data));
        break;
      case "d": // fim
        console.log("\n--- FIM ---");
        break;
    }
  }
}
```

---

## Fluxo completo recomendado para React

```tsx
import { useState, useEffect } from "react";
import { Chat } from "@codrstudio/openclaude-chat";
import "@codrstudio/openclaude-chat/styles.css";

const API_KEY = "sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9";
const BACKBONE_URL = "http://localhost:6002";

export function AgentPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Criar sessão ao montar
    fetch(`${BACKBONE_URL}/api/v1/ai/conversations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agentId: "system.sandbox" }),
    })
      .then((r) => r.json())
      .then((data) => setSessionId(data.session_id));
  }, []);

  if (!sessionId) return <div>Carregando...</div>;

  return (
    <div style={{ height: "100vh" }}>
      <Chat
        endpoint={BACKBONE_URL}
        token={API_KEY}
        sessionId={sessionId}
        enableAttachments={true}
        enableRichContent={true}
        placeholder="Pergunte algo ao agente..."
      />
    </div>
  );
}
```
