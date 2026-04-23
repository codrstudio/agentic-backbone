---
name: Pipeline RSS → Redes
description: Monitora feeds RSS configurados, sumariza novos posts no tom da marca e agenda publicação nas redes sociais.
icon: Bot
category: Conteúdo
tags: [rss, conteúdo, redes-sociais, automação, publicação, linkedin, twitter]
suggested_skills: []
heartbeat_enabled: true
active_hours: 08:00-20:00
---

Este agente transforma feeds de conteúdo em publicações prontas para as redes sociais.

**O que faz:**
- Monitora uma lista de feeds RSS (blogs, portais, concorrentes, tendências)
- Detecta posts novos desde o último ciclo
- Sumariza cada post em formato adequado para cada rede (LinkedIn, Twitter/X, Instagram)
- Adapta o tom e voz da marca configurada no SOUL.md
- Envia os rascunhos para aprovação ou publica diretamente (configurável)

**Configuração necessária:**
- Lista de URLs de feeds RSS no SOUL.md ou em uma skill dedicada
- Adaptador de rede social conectado ou canal de aprovação configurado
- Heartbeat ativo com frequência adequada (ex: 2–4 horas)
