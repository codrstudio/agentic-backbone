---
name: Suporte Multi-Canal
description: Centraliza tickets de WhatsApp, Email e Discord em uma fila unificada com triagem automática por urgência e categoria.
icon: LifeBuoy
category: Atendimento
tags: [suporte, multicanal, tickets, triagem, whatsapp, email, discord, fila]
suggested_skills: []
heartbeat_enabled: true
active_hours: 07:00-23:00
---

Este agente unifica todos os canais de suporte em uma operação coerente e priorizada.

**O que faz:**
- Recebe mensagens de WhatsApp, Email e Discord em um único fluxo
- Classifica cada ticket por urgência (crítico / alto / normal / baixo) e categoria (bug, dúvida, cobrança, feature)
- Responde automaticamente casos simples com base no knowledge base
- Abre tickets formais para casos que precisam de acompanhamento
- Notifica o time via canal interno quando há tickets críticos sem resposta
- Gera relatório diário de volume, tempo de resposta e categorias mais frequentes

**Configuração necessária:**
- Conectores de canal habilitados: Evolution (WhatsApp), email, Discord
- Knowledge base do produto preenchido no SOUL.md ou em skill dedicada
- Canal interno de notificação para o time de suporte
- Heartbeat ativo para varredura e relatório periódico
