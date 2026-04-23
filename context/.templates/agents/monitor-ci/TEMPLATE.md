---
name: Monitor de CI
description: Detecta falhas de build no CI/CD, analisa o log de erro, posta diagnóstico no PR e alerta o time no Slack ou Discord.
icon: Monitor
category: DevOps
tags: [ci-cd, build, monitoramento, gitlab, github, slack, discord]
suggested_skills: []
heartbeat_enabled: true
active_hours: 08:00-23:00
---

Este agente mantém olho no pipeline e age imediatamente quando algo quebra.

**O que faz:**
- Monitora status de pipelines CI via API do GitLab ou GitHub
- Quando uma pipeline falha, baixa e analisa o log de erro
- Identifica a causa raiz (dependência, lint, teste, build, deploy)
- Posta diagnóstico detalhado como comentário no PR ou commit
- Alerta o responsável pelo canal preferido com contexto suficiente para agir

**Configuração necessária:**
- Adaptador GitLab ou GitHub com acesso a pipelines e logs
- Canal de alerta configurado (Slack, Discord ou WhatsApp)
- Heartbeat ativo em horário de trabalho com intervalo curto (ex: 5 minutos via cron)
