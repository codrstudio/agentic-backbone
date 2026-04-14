# API de Conversas

## Headers padrão

```
Authorization: Bearer sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9
Content-Type: application/json
```

---

## 1. Criar sessão

```
POST /api/v1/ai/conversations
```

```json
{
  "agentId": "system.sandbox"
}
```

**Resposta (201):**
```json
{
  "session_id": "d5d04a0f-3538-457d-a0ef-915515d45229",
  "user_id": "system",
  "agent_id": "system.sandbox",
  "title": null,
  "starred": false,
  "created_at": "2026-04-13T06:48:08.403Z",
  "updated_at": "2026-04-13T06:48:08.403Z"
}
```

**IMPORTANTE**: Guardar o `session_id` — ele identifica a conversa para todas as operações seguintes.

---

## 2. Enviar mensagem (com streaming)

```
POST /api/v1/ai/conversations/{session_id}/messages?format=datastream&rich=true
```

```json
{
  "message": "Olá, me ajude com algo"
}
```

### Parâmetros de query

| Param | Descrição |
|-------|-----------|
| `format=datastream` | Retorna no AI SDK Data Stream Protocol (compatível com `@ai-sdk/react` useChat) |
| `rich=true` | Inclui display tools (cards, gráficos, etc) no stream |

### Resposta (stream)

A resposta é um stream de linhas no formato `{código}:{valor}\n`:

```
2:[{"type":"init","sessionId":"f3deb863-..."}]

0:"Olá! "

0:"Como posso ajudar?"

e:{"finishReason":"stop","isContinued":false}

2:[{"type":"usage","inputTokens":13617,"outputTokens":110,"totalCostUsd":0.07,"durationMs":1188}]

d:{"finishReason":"stop"}
```

### Códigos do Data Stream Protocol

| Código | Tipo | Valor |
|--------|------|-------|
| `0` | text | `string` — chunk de texto da resposta |
| `2` | data | `array` — metadata (init, usage) |
| `3` | error | `string` — mensagem de erro |
| `9` | tool_call | `{toolCallId, toolName, args}` |
| `a` | tool_result | `{toolCallId, result}` |
| `d` | finish_message | `{finishReason}` — fim da mensagem |
| `e` | finish_step | `{finishReason, isContinued}` — fim de um step |
| `f` | start_step | início de um step |

### Ordem típica dos eventos

```
2:[{"type":"init",...}]     ← início, contém sessionId
0:"texto..."                ← chunks de texto (N vezes)
9:{tool_call}               ← (opcional) chamada de tool
a:{tool_result}             ← (opcional) resultado de tool
0:"mais texto..."           ← texto após tool
e:{finishReason:"stop"}     ← fim do step
2:[{"type":"usage",...}]    ← métricas de uso
d:{finishReason:"stop"}     ← fim da mensagem
```

---

## 3. Listar conversas

```
GET /api/v1/ai/conversations
```

**Resposta (200):** Array de sessões.

---

## 4. Histórico de mensagens

```
GET /api/v1/ai/conversations/{session_id}/messages?limit=50
```

**Parâmetros:**

| Param | Descrição |
|-------|-----------|
| `limit` | Máximo de mensagens (default 50, max 200) |
| `before` | Cursor para paginação (message ID) |

**Resposta (200):**
```json
{
  "messages": [
    {
      "id": "msg_...",
      "role": "user",
      "content": "Olá",
      "_meta": { "ts": "2026-04-13T...", "userId": "system" }
    },
    {
      "id": "msg_...",
      "role": "assistant",
      "content": "Olá! Como posso ajudar?"
    }
  ],
  "nextCursor": "msg_..."
}
```

---

## 5. Atualizar sessão

```
PATCH /api/v1/ai/conversations/{session_id}
```

```json
{
  "title": "Minha conversa",
  "starred": true
}
```

---

## 6. Deletar sessão

```
DELETE /api/v1/ai/conversations/{session_id}
```

---

## 7. Upload de arquivos

```
POST /api/v1/ai/conversations/{session_id}/messages
Content-Type: multipart/form-data
```

```
FormData:
  message: "Analise este arquivo"
  files: <File> (1 a 10 arquivos)
```

**MIME types aceitos:** PNG, JPEG, GIF, WebP, PDF, TXT, CSV, JSON, WAV, MP3, OGG, WebM, DOCX, XLSX.

---

## Exemplo completo (curl)

```bash
API_KEY="sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9"

# 1. Criar sessão
SESSION=$(curl -s http://localhost:6002/api/v1/ai/conversations \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"system.sandbox"}' | jq -r '.session_id')

echo "Session: $SESSION"

# 2. Enviar mensagem (stream)
curl -N http://localhost:6002/api/v1/ai/conversations/$SESSION/messages?format=datastream \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Olá, quem é você?"}'
```
