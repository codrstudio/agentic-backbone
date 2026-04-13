# Principios da Migracao

## Contexto

O agentic-sdk (Vercel AI SDK) foi um workaround porque o Claude era caro. Com o OpenClaude SDK, voltamos a ideia original: usar o Claude Code como engine de agente.

O OpenClaude SDK e o agentic-sdk sao ambos projetos nossos. O codigo fonte de ambos esta disponivel para edicao. Mas o OpenClaude SDK nao e so nosso — e um produto usado por inumeros aplicativos. Ele faz o mesmo que o Claude Code faz.

## Postura

Nao estamos adaptando a openclaude-sdk pra parecer com a agentic-sdk. Estamos **abandonando** a agentic-sdk e abraçando o modelo do Claude Code. O backbone se adapta ao query(), nao o contrario.

## Responsabilidades

### OpenClaude SDK (generico, qualquer app usa)
- Loop de agente (steps, turns)
- Tools built-in (Read, Write, Edit, Bash, Grep, etc.)
- Compactacao de contexto
- Sessao/persistencia
- System prompt base
- MCP client
- Streaming de eventos

### Backbone (especifico do nosso produto)
- Tools de negocio (jobs, memory, cron, connectors, channel messages)
- Routing/selecao de modelo por agente
- System prompt de dominio (identidade do agente, skills, contexto)
- Persistencia propria (SQLite, JSONL)
- Autenticacao, canais, webhooks
- Telemetria, billing, quotas

## Constatacao

O agente **e** o Claude Code — configurado pelo backbone. O backbone nao implementa um agente proprio; ele configura o Claude Code pra cada contexto (agente, conversa, cron, heartbeat). Skills, historico, settings, tudo vive na pasta do agente via `CLAUDE_CONFIG_DIR`. O backbone orquestra; o Claude Code executa.

Isso era o objetivo desde o inicio. A agentic-sdk foi um desvio necessario por custo. Com o OpenClaude SDK, voltamos ao plano original.

## Regra de ouro

Antes de implementar qualquer coisa, perguntar: "Isso e responsabilidade do Claude Code ou nossa?"

- Se e do Claude Code → implementar na openclaude-sdk (beneficia todos os usuarios)
- Se e do nosso produto → implementar no backbone
- Se a agentic-sdk fazia algo que o Claude Code ja faz nativamente → descartar, nao reimplementar
