# Configuração de Agentes

## Agentes disponíveis

O backbone descobre agentes automaticamente pelo diretório `context/agents/{owner}.{slug}/AGENT.yml`.

### Listar agentes via API

```bash
curl http://localhost:6002/api/v1/ai/agents \
  -H "Authorization: Bearer sk_45a4ec88acda0d9b1f20d7cd193796cde88f0979d325f1a9ab14e187d3e40ae9"
```

### Agente atual: `system.sandbox`

Agente de sandbox para testes. É o agente disponível e autorizado pela API key.

## Restrição de acesso

A API key define quais agentes o cliente pode acessar via `allowed-agents`:

```yaml
# context/credentials/api-keys/external-app.yml
secret-key: sk_...
user: system
allowed-agents:
  - system.sandbox      # agentes que esta key pode acessar
  - system.main         # adicionar mais conforme necessário
```

Se `allowed-agents` estiver vazio (`[]`), a key não terá acesso a nenhum agente. Sempre listar explicitamente os agentes permitidos.

## Criar um agente customizado

Para criar um agente específico para seu app:

1. Criar diretório: `context/agents/system.meu-agente/`
2. Criar `AGENT.yml`:

```yaml
id: system.meu-agente
slug: meu-agente
owner: system
enabled: true
delivery: conversation
description: "Agente especializado para meu app"
```

3. Criar `SOUL.md` (personalidade/instruções do agente):

```markdown
---
---

Você é um assistente especializado em [domínio].

## Regras
- Responda sempre em português
- Seja conciso
- [suas regras aqui]
```

4. Atualizar a API key para incluir o novo agente:

```yaml
allowed-agents:
  - system.sandbox
  - system.meu-agente
```

5. O hot-reload do backbone detecta automaticamente novos agentes.
