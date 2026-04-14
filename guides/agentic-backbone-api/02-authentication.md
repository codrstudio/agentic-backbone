# Autenticação — API Key

## API Key pronta para uso

```
sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9
```

**Status: TESTADA E FUNCIONANDO** (2026-04-13)

## Como usar

Enviar em TODAS as requisições HTTP no header `Authorization`:

```
Authorization: Bearer sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9
```

## Para SSE/EventSource

O browser `EventSource` não suporta headers customizados. Use query parameter:

```
?token=sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9
```

## Configuração da API Key

A API key está configurada em:
```
context/credentials/api-keys/external-app.yml
```

```yaml
secret-key: sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9
user: system
allowed-agents:
  - system.sandbox
```

### Campos

| Campo | Descrição |
|-------|-----------|
| `secret-key` | A chave (prefixo `sk_`). Auto-encriptada em repouso |
| `user` | Usuário associado (determina acesso a conversas) |
| `allowed-agents` | Lista de agentes que esta key pode acessar. Se vazio, bloqueia tudo. Para acesso irrestrito, listar todos os agentes desejados |

## Verificar autenticação

```bash
curl http://localhost:6002/api/v1/ai/auth/me \
  -H "Authorization: Bearer sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9"
```

Resposta esperada:
```json
{
  "user": "system",
  "role": "user",
  "displayName": "Super Admin"
}
```

## Alternativa: Login com senha

Se preferir não usar API Key, pode autenticar via login:

```bash
curl -X POST http://localhost:6002/api/v1/ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"system","password":"12345678"}'
```

Retorna cookie `token` HttpOnly. Todas as requisições subsequentes com `credentials: "include"` serão autenticadas.
