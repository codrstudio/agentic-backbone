# Migration Decisions

Todas as decisoes tomadas para migrar agentic-sdk/chat → openclaude-sdk/chat.

## Fase 0 — Decisoes fundamentais

- [x] Rewrite (nao adapter) — backbone se adapta ao query(). Ver D-01.
- [x] Descartar aiGenerateObject(). Ver D-02.
- [x] Suite openclaude-chat: Chat + History + TopBar. Ver D-03.
- [x] Contrato de dados via Zod no SDK + prefixo customizavel. Ver D-04.

## Fase 1 — openclaude-sdk: contratos e tools de negocio

- [x] Tools internas viram MCP server "builtin", selecao por agente via AGENT.yml. Ver D-05.
- [x] Reescrever `src/agent/` — usar `query()` com tipo backbone proprio mapeado de SDKMessage. Ver D-06.
- [x] Provider routing — planos com matriz 3x3 substituem routing rules. Ver D-07.
- [x] Schemas Zod de contrato — SDK exporta mensagem/usage/sessao, chat exporta gestao de conversa. Ver D-08.

## Fase 2 — openclaude-chat: suite completa

- [x] Transport layer: endpoint+token (modo simples) ou transport custom (modo avancado). Ver D-09.
- [x] Rotas existentes do backbone sao compativeis com ChatTransport. Ver D-10.
- [x] Chat rico: renderizar todos os SDKMessage relevantes, nao so 3. Ver D-11.
- [x] Historico: paginacao reversa cursor-based, leitura do JSONL do CLI. Ver D-12.
- [x] Componente `History` — plano em `openclaude-chat/.tmp/plan.txt`, transport em `openclaude-chat/.tmp/-SPEC.md`

## Fase 3 — Swap no backbone

- [x] Historico, sessao e estatisticas — decisoes de arquitetura. Ver D-13.
- [x] Multi-agent por sessao — agente escolhido por turno, sem options.agents. Ver D-14.
- [x] openclaude-sdk: options.configDir nao existe, implementacao trivial (env var no child process). Sem risco.
- [x] Swap de dependencia: ai-sdk usado por backbone + ai-chat. ai-chat usado por hub + apps/chat. Ver D-15.
- [x] GET messages: formato JSONL do CLI validado por teste real. Sem risco.
- [x] POST messages: infra SSE ja existe, muda so o payload. Sem risco.
- [x] Stats do result: todos os campos (cost, tokens, duration, turns, stopReason, modelUsage) existem. Sem risco.

## Fase 4 — Validacao de risco

Pontos que podem quebrar na migracao. Cada um precisa ser validado antes de executar.

- [x] Conversa basica — query() + resume. Sem risco (D-13).
- [x] Tool calls via MCP — testado e validado. Ver D-19.
- [x] Cron + heartbeat — funciona com query() sem resume. Ver D-16, D-20.
- [x] Cost tracking — todos os campos existem no result event. Sem risco.
- [x] Display renderers — richOutput repassado do chat ao SDK. Sem risco. Ver D-17, D-20.
- [x] Multi-agent — validado, CLI aceita tudo junto. Sem risco (D-14).
- [x] Paginacao — O(n) no JSONL, aceitavel pra conversas normais. Otimizar depois se necessario.
- [x] Legacy — formato simples, conversor direto. Sem risco.

## Fase 5 — Cleanup

- [x] Remover ai-sdk — so backbone e ai-chat dependem. Sem risco apos migracao.
- [x] Remover ai-chat — hub + apps/chat dependem (D-15). Sem risco apos migracao.
- [x] Deps orfas — @ai-sdk/react sai com ai-chat. Mas pacote `ai` (Vercel) usado em 60+ tools do backbone. Ver D-18.
- [x] Atualizar CLAUDE.md — mecanico, sem risco.

---

## Decisoes

### D-01: Rewrite, nao adapter

O backbone se adapta ao `query()` da openclaude-sdk. Nao criamos camada de compatibilidade com a interface antiga da agentic-sdk. A agentic-sdk foi um workaround; agora abraçamos o modelo do Claude Code.

### D-02: Descartar aiGenerateObject()

Unico uso era em `memory/flush.ts` pra extrair fatos. Com o novo modelo de memoria via LYT (`context/templates/agent`), a memoria sera gerida pelo proprio agente no workspace. Nao precisa migrar nem reimplementar.

### D-03: Suite openclaude-chat (Chat + History + TopBar)

Tres componentes formam um chat rico e auto-gerido:
- **Chat** — conversa (mensagens + input). Ja existe.
- **History** — lista de conversas (rename, delete, favoritar, busca, agrupamento). Novo.
- **TopBar** — info da conversa ativa + acoes (rename, export). Adiado.

ConversationList nao vai pro hub — vira o componente History dentro do openclaude-chat pra que qualquer app possa usar a suite completa.

### D-04: Contrato de dados e rotas

- Schemas Zod vivem no SDK. Chat e server importam de la. Source of truth unico.
- SDK define contrato de dados (Zod), nao rotas HTTP. O server implementa rotas como quiser.
- openclaude-chat usa prefixo customizavel (`endpoint` prop). Paths padrao: `/conversations`, `/conversations/:id`, `/conversations/:id/messages`, etc. Ver report\-ROTAS.txt.
- Escape hatch: prop `transport` permite backends nao-padrao plugarem funcoes customizadas.
- Takeover/release sao especificos do backbone, ficam fora do chat generico.

### D-05: Tools unificadas via MCP

- Tools internas (jobs, memory, cron, messages, emit, sysinfo) viram MCP tools num server "builtin" gerido pelo backbone.
- Adapters externos ja sao MCP.
- Tudo MCP, selecao por agente via `adapters` em AGENT.yml + `resolveAdapters()`.
- Nao precisa de tool adapter helper na openclaude-sdk — o backbone gerencia seus proprios MCP servers e passa so os permitidos pra `query()` via `options.mcpServers`.
- `allowedTools` por server fica pra depois se necessario (builtin vai inteiro por ora).

### D-06: Mapeamento SDKMessage → tipo backbone proprio

- `src/agent/index.ts` chama `query()` e traduz SDKMessage → tipo enxuto do backbone num unico ponto.
- Backbone nao precisa conhecer os 20+ tipos de SDKMessage. Consome 5-6 eventos: text, tool-call, tool-result, usage, result, reasoning.
- `step_finish` nao existe na openclaude-sdk. Substituido por boundary na chegada de SDKAssistantMessage completa. `stream-dispatcher.ts` precisa ser adaptado pra esse novo sinal.
- `datastream.ts` sera reescrito (protocolo Vercel AI SDK descartado).
- `init` e `reasoning` nao sao consumidos por logica de negocio — podem ser ignorados ou mapeados opcionalmente.

### D-07: Planos substituem routing rules

- Planos (free, economic, standard, premium, max) com matriz 3x3: class (small/medium/large) × effort (low/mid/high).
- Cada slug resolve pra `{ provider, model, parameters }`. Provider sempre explicito, nunca inferido.
- Roles (conversation, heartbeat, memory, cron) mapeiam pra slugs.
- Sistema fala em role ou slug, nunca em modelo concreto. So o plano conhece modelos.
- Routing rules, RoutingRule, RoutingContext — tudo removido. Codigo legado descartado.
- Backbone le plano YAML, resolve role→slug→llm, monta ProviderRegistry pra query().
- Parameters variam por provider (Groq: reasoning_effort, Anthropic: thinking). Schema usa Record<string, unknown>.
- Planos existem em `context/plans/*.yml`. Plano ativo definido em settings.

### D-08: Schemas Zod de contrato

- Schemas de mensagem, usage e sessao vivem no SDK (SDKMessage, ModelUsage, etc.). Ja existem.
- Schemas de gestao de conversa vivem no chat (Conversation, HistoryGroup, PATCH rename/star, etc.). Sao responsabilidade do History/TopBar.
- Server importa do SDK pra mensagens e do chat pra gestao de conversa.
- Plano do History ja esta adiantado em `.tmp/plan.txt` do openclaude-chat, com arquitetura, props, mockup e HistoryProvider.

### D-09: Transport layer do chat

- Componentes nunca chamam fetch diretamente. Sempre usam objeto `transport`.
- Modo simples: cliente passa `endpoint` + `token`. Chat cria `createDefaultTransport(endpoint, token)` internamente.
- Modo avancado: cliente passa `transport` customizado. `endpoint` e `token` sao ignorados.
- Interface `ChatTransport` define todos os metodos (listConversations, createConversation, getConversation, updateConversation, deleteConversation, exportConversation, getMessages, sendMessage, getAttachmentUrl).
- Transport default monta URLs: `{endpoint}{path}` com paths padrao (/conversations, /conversations/:id, etc.).
- Auth via `Authorization: Bearer {token}`. Attachments usam `?token=` pra uso direto em img src.
- Spec completa em `openclaude-chat/.tmp/-SPEC.md`.

### D-10: Rotas existentes compativeis, chat define o contrato

- As rotas de conversa do backbone (GET/POST/PATCH/DELETE /conversations/*) ja servem o que o ChatTransport precisa. Nao precisa criar rotas novas.
- O contrato Zod de gestao de conversa (Conversation, Message, PATCH, etc.) eh definido pelo **chat**, nao pelo SDK nem pelo backbone.
- O backbone implementa as rotas respeitando os schemas do chat. Se o backbone retorna algo diferente (ex: starred como 0/1), o backbone se adapta pra boolean.
- Schemas do agente (SDKMessage, ModelUsage) vem do SDK. Schemas de conversa vem do chat. O backbone respeita ambos.
- Takeover/release ficam fora do chat (D-04). O backbone mantem essas rotas, mas o chat nao as consome.

### D-11: Chat rico — renderizar todos os SDKMessage relevantes

- Chat atual consome so 3 tipos (assistant, user, result) e descarta o resto. Desperdicio.
- Chat deve renderizar: streaming parcial (text char-by-char), tool progress (elapsed time), task lifecycle (started/progress/completed), turn metrics (custo, tokens, duracao), rate limit warnings, prompt suggestions, tool summaries, compact boundaries, hook status.
- Backbone nao grava JSONL proprio — le do JSONL do CLI (ver D-13). Stats (result) vao pro SQLite.
- Conversas legacy (formato antigo) convertidas on-the-fly no GET messages.
- Prioridade: (1) streaming parcial, (2) tool progress, (3) turn metrics, (4) tasks, (5) polish.
- Spec completa em `report/CHAT-RICH-MESSAGES.md`.

### D-12: Historico paginado e formato de storage

- Backbone le historico do JSONL do CLI (ver D-13). Nao grava JSONL proprio.
- Compactacao do Claude Code nao afeta o backbone. CLI acumula tudo no JSONL, historico sempre completo.
- GET messages agora e paginado: `?limit=50&before=<cursor>` → `{ messages, hasMore, cursor }`.
- Chat usa paginacao reversa: carrega ultimas 50 no mount, infinite scroll pra cima carrega batches anteriores.
- Conversas legacy (formato antigo) convertidas on-the-fly no GET. Transparente pro chat.
- Spec completa em `report/CHAT-HISTORY.md`. Rotas atualizadas em `report/-ROTAS.txt`.

### D-13: CLAUDE_CONFIG_DIR por agente — historico, skills, auth, tudo junto

- Cada agente tem seu proprio `CLAUDE_CONFIG_DIR` (ex: `context/agents/{agentId}/.claude-config/`).
- Backbone passa via `options.env.CLAUDE_CONFIG_DIR` em cada `query()`.
- **Auth:** `.credentials.json` copiado (ou symlink) do `~/.claude/`. Testado e confirmado: funciona.
- **Skills:** em `{configDir}/skills/`. CLI carrega automaticamente. Nao precisa injetar via prompt.
- **Historico:** gravado pelo CLI em `{configDir}/projects/<sanitized-cwd>/<sessionId>.jsonl`. Backbone le de la pra servir ao chat.
- **Settings:** `{configDir}/settings.json` — settings por agente.
- **Backup:** tudo dentro de `context/`, coberto pelo backup.
- Sessao/continuidade: primeiro turno usa `options.sessionId`, turnos seguintes usam `options.resume`. CLI carrega contexto anterior automaticamente.
- Estatisticas (custo, tokens, duracao): capturadas do `result` event no stream e gravadas em SQLite. Nao vao pro historico. SQLite por ora, migrar pra Postgres depois.
- Attachments: backbone salva no workspace do agente, passa caminho absoluto no prompt. CLI le via Read tool.
- Formato do JSONL do CLI pode mudar entre versoes — risco aceito, atualiza conversor se necessario.
- SDK e passthrough puro: result, rate_limit_event, system init vem do CLI, nao sao inventados pela SDK.
- Nao precisa de `options.configDir` na SDK — `options.env` ja suporta passar CLAUDE_CONFIG_DIR.

### D-14: Multi-agent por sessao

- Cada turno e um processo CLI novo. O CLI nao precisa conhecer todos os agentes — recebe a config do agente escolhido naquele turno.
- Chat mostra combo de selecao de agente (lista vem de `GET /agents`).
- Ao enviar mensagem, chat inclui agentId escolhido.
- Backbone resolve o agente (system prompt, tools/MCP servers, model) e chama `query()` com `options.resume` + `options.systemPrompt` + `options.mcpServers` + `options.model` daquele agente.
- Validado: CLI aceita resume + systemPrompt + model + mcpServers juntos, sem exclusividade.
- Nao usa `options.agents` nem `options.agent` — config e injetada diretamente por turno.
- POST /conversations aceita `{ agentId, multiAgent?: boolean }`. Se multiAgent, chat habilita selecao de agente.
- Agentes disponiveis: todos os agentes do usuario (via `GET /agents`).

### D-16: Cron/heartbeat — sessoes efemeras

- Cron e heartbeat sao fire-and-forget, sem sessao, sem chat. Cada invocacao e um query() sem resume.
- Risco: cada query() cria JSONL no disco. Heartbeat a cada 30s = 2.880 arquivos/dia/agente.
- Solucao: usar `options.persistSession = false` pra cron e heartbeat. CLI nao grava JSONL.
- Stats (result) continuam chegando no stream — backbone captura e grava no SQLite normalmente.

### D-17: Display tool naming — prefixo MCP

- Na agentic-sdk: tools se chamam `display_chart`, `display_table`, etc.
- Na openclaude-sdk via MCP: tools chegam como `mcp__display__display_chart`.
- Chat precisa ajustar `resolveDisplayRenderer()` pra extrair nome apos prefixo MCP.
- Solucao: match por sufixo em vez de nome exato.

### D-20: O agente e um — config nao varia por modo

- O agente do backbone e um agente construido em cima do OpenClaude. Suas configs sao do agente, nao do modo.
- **Nao mudam por modo:** CLAUDE_CONFIG_DIR, systemPrompt, mcpServers (tools/adapters), skills.
- **Mudam por modo:**
  - `model` — via role no plano (conversation, heartbeat, cron podem ter slugs diferentes)
  - `cwd` — conversation tem pasta propria por sessao, resto usa raiz do agente
  - `persistSession` — true so pra conversation. Heartbeat, cron, request nao gravam historico.
  - `resume` — so conversation retoma sessao
- **Skills:** definidas na interface, gravadas em `{CLAUDE_CONFIG_DIR}/skills/{slug}/SKILL.md`. CLI carrega automaticamente.
- **richOutput:** decidido pelo chat, backbone so repassa pro SDK. Nao e config do agente.

### D-19: MCP tools validado na pratica

- **Testado e confirmado:** stdio + http funcionam juntos na mesma query.
- Tools internas do backbone → `type: "stdio"` (processo Node.js com MCP server). Funciona.
- Adapters MCP externos → `type: "http"` (server remoto). Funciona.
- `createSdkMcpServer()` da openclaude-sdk com transport HTTP → **falha** (auth provider do CLI interfere). Nao usar.
- Backbone levanta MCP servers diretamente (sem usar createSdkMcpServer). Passa como stdio pro CLI.
- Naming confirmado: `mcp__{serverName}__{toolName}` (ex: `mcp__backbone-builtin__backbone_echo`).
- Chat precisa match por sufixo pra display renderers (D-17 confirmado).
- Ambos servers conectaram com `status: "connected"` e tools foram chamadas em paralelo pelo agente.

### D-18: Pacote `ai` (Vercel) nao pode ser removido imediatamente

- O backbone usa `import { tool } from "ai"` em 60+ arquivos (todos os connectors, jobs, cron, memory, etc.).
- `tool()` do Vercel AI SDK e a factory usada pra definir tools hoje.
- Com a migracao pra MCP (D-05), essas tools vao virar MCP tools. Mas ate serem reescritas, o pacote `ai` continua como dependencia do backbone.
- Cleanup do pacote `ai` so acontece depois que todas as ~60 tools forem migradas pra formato MCP.
- @ai-sdk/react sai junto com ai-chat. Sem problema.

### D-15: apps/chat tambem depende de ai-chat

- `apps/chat` (app standalone) depende de `@agentic-backbone/ai-chat`. Precisa ser migrado pra `@codrstudio/openclaude-chat` junto com o hub, senao quebra.
- Adicionar ao IMPL.md.
