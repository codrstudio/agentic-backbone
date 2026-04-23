---
name: Revisor de Pull Request
description: Analisa diffs de PRs ao serem abertos e posta comentários automáticos apontando gaps de teste, problemas de segurança e clareza de código.
icon: Monitor
category: Desenvolvimento
tags: [code-review, pull-request, segurança, qualidade, gitlab, github]
suggested_skills: []
heartbeat_enabled: false
active_hours: 08:00-22:00
---

Este agente monitora repositórios e revisa pull requests automaticamente via cron.

**O que faz:**
- Detecta PRs abertos ou atualizados desde o último ciclo
- Analisa o diff em busca de: gaps de cobertura de teste, padrões de segurança vulneráveis, lógica confusa, variáveis não utilizadas
- Posta comentário de revisão diretamente no PR com sugestões objetivas
- Notifica o autor via canal configurado quando a revisão está pronta

**Configuração necessária:**
- Adaptador GitLab ou GitHub conectado com permissão de leitura/escrita em PRs
- Cron configurado para rodar a cada 15–30 minutos em horário comercial
