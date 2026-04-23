---
name: Triagem de Email
description: Lê o inbox, categoriza mensagens por prioridade, cria rascunhos de resposta e agenda follow-ups automaticamente.
icon: Headphones
category: Operações
tags: [email, inbox, produtividade, rascunhos]
suggested_skills: []
heartbeat_enabled: true
active_hours: 08:00-18:00
---

Este agente monitora seu inbox de email e executa triagem automática a cada ciclo de heartbeat.

**O que faz:**
- Lê emails não lidos e os classifica por prioridade (urgente / importante / informativo / spam)
- Para emails que pedem resposta, gera um rascunho alinhado ao tom da organização
- Detecta follow-ups pendentes e agenda lembretes
- Entrega um resumo do inbox via canal configurado (WhatsApp, Slack, Discord)

**Configuração necessária:**
- Adaptador de email conectado (`email` connector) com conta configurada
- Canal de notificação para receber o resumo diário
