● Boa. Agora tenho o inventário completo do AI SDK v6 vs o que vocês usam. Aqui vai o mapa:
                                                                                                                                               O que vocês JÁ usam                                                                                                                                                                                                                                                                     
  ┌─────────────────────┬─────────────────────────────────────────────────────────┐                                                            │       Feature       │                          Onde                           │                                                          
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ streamText()        │ agent.ts — core do agent loop                           │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ Tool calling        │ 15+ tools built-in (Read, Bash, Edit, etc.)             │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ MCP (infra pronta)  │ @ai-sdk/mcp instalado, código existe, mas nunca chamado │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ Session persistence │ Custom (save/load JSONL)                                │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ Context compaction  │ Custom (compactMessages)                                │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ Tool repair         │ createToolCallRepairHandler()                           │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ Middleware pipeline │ Suportado via options.middleware                        │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ Telemetry/OTel      │ Suportado via options.telemetry                         │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ stepCountIs         │ Stop condition                                          │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ onStepFinish        │ Step tracking                                           │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ prepareStep         │ Per-step model/tool override                            │
  └─────────────────────┴─────────────────────────────────────────────────────────┘

  O que vocês NÃO usam e poderiam

  1. Structured Output (Output.object(), Output.array())

  O AI SDK v6 unificou generateText + generateObject. Você pode pedir pro modelo retornar JSON tipado com schema Zod durante um tool loop.   
  Hoje o backbone trata tudo como texto livre.

  Use case concreto: memory extraction, heartbeat decisions, cron job parsing — tudo que hoje é regex/heurística poderia ser structured      
  output.

  2. needsApproval nativo

  V6 tem needsApproval como flag na tool definition. Vocês reimplementaram isso manualmente com wrapper no execute (agent.ts:274-309). A     
  versão nativa é mais limpa e suporta approval condicional por função.

  3. DevTools

  @ai-sdk/devtools — middleware que dá visibilidade total nos LLM calls: tokens, latência, raw provider data. Resolve exatamente o problema  
  que você descreveu (não saber se o sistema caiu). É um painel local que mostra cada step em tempo real.

  4. generateText() para tarefas não-streaming

  Vocês usam streamText() pra tudo. Para operações batch (memory extraction, heartbeat decision, cron parsing) onde streaming não importa,   
  generateText() é mais simples, sem async generator, e retorna resultado direto.

  5. Embeddings nativo (embed, embedMany)

  Vocês usam a API da OpenAI diretamente para embeddings no memory pipeline. O AI SDK abstrai isso com embed() / embedMany() e suporta       
  múltiplos providers.

  6. Reranking (rerank())

  O memory search hoje faz hybrid scoring manual (0.7 vector + 0.3 FTS5). O SDK tem rerank() nativo com Cohere/Together.ai que poderia       
  melhorar a qualidade.

  7. Agent class (novo no v6)

  const agent = new ToolLoopAgent({
    model, tools, system,
    needsApproval: (toolCall) => dangerousTools.includes(toolCall.toolName),
  })
  Substitui todo o streamText + stepCountIs + onStepFinish + retry manual. É uma abstração mais alta que encapsula o loop.

  8. Provider-specific tools

  O SDK expõe tools nativas dos providers — Anthropic tem computer_use, code_execution, memory. Nada disso é usado.

  9. Resumable Streams

  Para reconexão SSE — se o cliente desconecta e reconecta, pode retomar de onde parou em vez de perder o stream.

  10. Caching

  O SDK tem suporte a cache de respostas (prompt caching). Reduz custo e latência para prompts repetitivos (heartbeat sempre manda o mesmo   
  system prompt).

  ---
  Prioridade que eu sugiro

  ┌────────────┬───────────────────────┬─────────────────────────────────────────────────┐
  │ Prioridade │        Feature        │                     Impacto                     │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Alta       │ DevTools              │ Resolve teu problema de visibilidade imediato   │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Alta       │ Structured Output     │ Elimina heurísticas frágeis (memory, heartbeat) │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Alta       │ MCP (já tem infra)    │ Só falta wiring — expansibilidade enorme        │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Média      │ Agent class           │ Simplifica o core, mas requer refactor          │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Média      │ generateText p/ batch │ Simplifica memory/heartbeat                     │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Média      │ needsApproval nativo  │ Limpa código, remove wrapper manual             │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Baixa      │ Embeddings/Reranking  │ Melhoria incremental                            │
  ├────────────┼───────────────────────┼─────────────────────────────────────────────────┤
  │ Baixa      │ Resumable Streams     │ Nice-to-have para UX                            │
  └────────────┴───────────────────────┴─────────────────────────────────────────────────┘