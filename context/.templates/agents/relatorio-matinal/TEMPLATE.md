---
name: Relatório Matinal
description: Toda manhã entrega um briefing personalizado com métricas do dia anterior, agenda, pendências e anomalias detectadas.
icon: Monitor
category: Produtividade
tags: [relatório, briefing, heartbeat, métricas, agenda]
suggested_skills: []
heartbeat_enabled: true
active_hours: 06:00-10:00
---

Este agente acorda cedo e entrega um briefing completo antes do seu dia começar.

**O que faz:**
- Compila métricas relevantes do dia anterior (vendas, tickets, commits, etc.)
- Puxa eventos e reuniões da agenda do dia
- Lista tarefas abertas e pendências em atraso
- Destaca anomalias e pontos de atenção
- Envia o resumo formatado no canal de sua preferência (WhatsApp, Slack, Email)

**Configuração necessária:**
- Canal de entrega configurado
- Fontes de dados relevantes (banco de dados, APIs, planilhas) acessíveis via MCP ou tools
- Heartbeat ativo com janela matinal (sugestão: 06:00–09:00)
