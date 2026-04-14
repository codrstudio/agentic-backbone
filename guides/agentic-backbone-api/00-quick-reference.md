# Quick Reference — Integração Agentic Backbone

## API Key (testada e funcionando)

```
sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9
```

## URL Base

```
http://localhost:6002/api/v1/ai
```

## Agente disponível

```
system.sandbox
```

## Endpoints principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/auth/me` | Verificar autenticação |
| `GET` | `/agents` | Listar agentes |
| `POST` | `/conversations` | Criar sessão (`{"agentId":"system.sandbox"}`) |
| `GET` | `/conversations` | Listar sessões |
| `POST` | `/conversations/{id}/messages` | Enviar mensagem (SSE stream) |
| `GET` | `/conversations/{id}/messages` | Histórico de mensagens |
| `PATCH` | `/conversations/{id}` | Atualizar título/favorito |
| `DELETE` | `/conversations/{id}` | Deletar sessão |

## React — Código mínimo

```tsx
import { Chat } from "@codrstudio/openclaude-chat";
import "@codrstudio/openclaude-chat/styles.css";

// 1. Criar sessão
const res = await fetch("http://localhost:6002/api/v1/ai/conversations", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ agentId: "system.sandbox" }),
});
const { session_id } = await res.json();

// 2. Renderizar chat
<Chat
  endpoint="http://localhost:6002"
  token="sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9"
  sessionId={session_id}
/>
```

## Pacote npm

```bash
npm install @codrstudio/openclaude-chat
```

## Documentos de especificação

| Arquivo | Conteúdo |
|---------|----------|
| `00-quick-reference.md` | Este documento — referência rápida |
| `01-overview.md` | Visão geral da arquitetura |
| `02-authentication.md` | API Key, autenticação, verificação |
| `03-conversation-api.md` | API de conversas, streaming, Data Stream Protocol |
| `04-react-integration.md` | Componente Chat, hook useBackboneChat, ChatProvider, HTTP puro |
| `05-agent-configuration.md` | Configuração de agentes, acesso, criar agente customizado |
| `06-error-handling.md` | Erros, códigos HTTP, resiliência |
