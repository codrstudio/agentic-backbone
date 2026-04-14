# Integração com Agentic Backbone — Visão Geral

## O que é

O **Agentic Backbone** é um runtime multi-agente autônomo que expõe agentes de IA via API REST com streaming SSE. Seu app se conecta ao backbone como cliente HTTP — envia mensagens e recebe respostas em tempo real via stream.

## Arquitetura de integração

```
┌─────────────┐       HTTP/SSE        ┌─────────────────────┐
│  Seu App    │ ◄──────────────────► │  Agentic Backbone   │
│  (React)    │   Bearer sk_...       │  (localhost:6002)   │
│             │                       │                     │
│  useBackbone│                       │  Agente IA          │
│  Chat hook  │                       │  (Claude Code CLI)  │
└─────────────┘                       └─────────────────────┘
```

## Fluxo básico

1. **Autenticar** — Usar API Key (`sk_...`) no header `Authorization: Bearer`
2. **Criar sessão** — `POST /api/v1/ai/conversations` com `agentId`
3. **Enviar mensagem** — `POST /api/v1/ai/conversations/{sessionId}/messages`
4. **Receber resposta** — Stream no formato Data Stream Protocol (compatível com `@ai-sdk/react`)

## URL base

```
http://localhost:6002/api/v1/ai
```

Em produção, substituir pelo domínio/IP do backbone.
