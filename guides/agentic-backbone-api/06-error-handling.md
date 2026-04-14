# Tratamento de Erros

## Formato padrão de erro

Todas as respostas de erro seguem:

```json
{
  "error": "mensagem descritiva"
}
```

## Códigos HTTP

| Código | Significado | Causa comum |
|--------|-------------|-------------|
| `400` | Bad Request | Campos obrigatórios faltando |
| `401` | Unauthorized | API key inválida, expirada ou ausente |
| `403` | Forbidden | API key válida mas agente não autorizado |
| `404` | Not Found | Sessão ou agente não existe |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Internal Error | Erro no servidor |

## Erros comuns

### `{"error":"unauthorized"}` (401)
- Verificar se o header `Authorization: Bearer sk_...` está correto
- Verificar se a API key existe em `context/credentials/api-keys/`

### `{"error":"forbidden"}` (403)
- O agente solicitado não está na lista `allowed-agents` da API key
- Solução: adicionar o agente em `external-app.yml`

### `{"error":"Agent 'X' not found"}` (404)
- O agente não existe ou não tem `AGENT.yml`
- Verificar com `GET /api/v1/ai/agents`

## Erros no stream

Durante o streaming, erros são enviados com código `3`:

```
3:"Mensagem de erro"
```

## Timeout

O hook `useBackboneChat` tem timeout de 30 segundos. Se o servidor não responder em 30s, o stream é abortado e um erro sintético é gerado.

## Resiliência recomendada

```typescript
// Retry simples para criação de sessão
async function createSessionWithRetry(agentId: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE}/conversations`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.session_id;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}
```
