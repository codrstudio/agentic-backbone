---
name: Triage de Backlog
description: Toda noite lê issues do GitLab ou GitHub, prioriza por urgência e impacto, aplica labels e entrega um digest para o time.
icon: Monitor
category: Desenvolvimento
tags: [backlog, issues, priorização, gitlab, github, digest]
suggested_skills: []
heartbeat_enabled: false
active_hours: 18:00-23:00
---

Este agente faz a triagem noturna do backlog para que o time comece o dia com prioridades claras.

**O que faz:**
- Lê issues abertas sem label ou sem prioridade definida
- Classifica por urgência (bloqueante / alto / médio / baixo) e impacto no produto
- Aplica labels e milestone automaticamente
- Detecta issues duplicadas ou relacionadas
- Envia digest noturno com top 5 prioridades para o canal do time

**Configuração necessária:**
- Adaptador GitLab ou GitHub conectado com permissão de escrita em issues
- Cron configurado para rodar uma vez por noite (ex: 22:00)
- Canal de notificação configurado (Slack, Discord ou email)
